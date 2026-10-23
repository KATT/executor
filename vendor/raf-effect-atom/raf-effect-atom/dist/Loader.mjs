import { __exportAll } from "./_virtual/_rolldown/runtime.mjs";
import { hydrated } from "./Hydration.mjs";
import { isDevelopment } from "./internal/development.mjs";
import { keyOf, take } from "./internal/leases.mjs";
import { atomOf, inBrowser, loaded as loaded$1, make as make$1, sourceOf } from "./internal/handles.mjs";
import { afterSeed, pending } from "./internal/seeds.mjs";
import { isRequestRegistry } from "./RequestRegistry.mjs";
import * as Atom from "effect/reactivity/Atom";
import * as Predicate from "effect/Predicate";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
// src/Loader.ts
/**
* Starts atoms from route loaders, before anything renders, so nothing
* waterfalls.
*
* Each verb takes a source, an atom family or an `AsyncResult` atom, with its
* arguments. It starts the atom in the registry, takes a lease on it, so the
* registry's idle TTL can't evict it before the route renders and
* `useAtomResult` takes it over, and returns its handle for the component
* that reads it:
*
* | Verb       | Starts the atom                 | Waits                         | Has a value already   |
* | ---------- | ------------------------------- | ----------------------------- | --------------------- |
* | `prefetch` | if it isn't in the registry     | never                         | leaves it alone       |
* | `ensure`   | if it isn't in the registry     | only while it's `Initial`     | returns it at once    |
* | `fetch`    | if it isn't, or refreshes it    | until the new result settles  | refreshes, then waits |
*
* `prefetchInBrowser` is `prefetch` in the browser. On the server, it
* starts nothing, and the browser's read starts the atom.
*
* Typed failures don't reject: `ensure` and `fetch` settle on them, and
* `result` returns the settled `AsyncResult`, so a loader can redirect on a
* tag and otherwise let a boundary render the failure. Only defects and
* interruptions reject.
*
* The verbs are Effects that need the `AtomRegistry`; `make` gives the same
* verbs as Promises over one registry, for loaders that are async functions.
*
* @stability unstable
* @since 0.1.0
*/
var Loader_exports = /* @__PURE__ */ __exportAll({
	LeaseTTL: () => LeaseTTL,
	ensure: () => ensure,
	fetch: () => fetch,
	make: () => make,
	prefetch: () => prefetch,
	prefetchInBrowser: () => prefetchInBrowser,
	result: () => result
});
/**
* How long a loader's lease keeps an atom mounted when no component takes it
* over. Default 30 seconds.
*
* **Details**
*
* A lease ends when `useAtomResult` mounts the atom, or when this time has
* passed, after which the registry's idle TTL applies as usual. On a request
* registry, leases last until the registry is disposed.
*
* @stability unstable
* @category references
* @since 0.1.0
*/
const LeaseTTL = Context.Reference("raf-effect-atom/Loader/LeaseTTL", { defaultValue: () => Duration.seconds(30) });
const start = Effect.fnUntraced(function* (atom) {
	const registry = yield* AtomRegistry.AtomRegistry;
	const seed = pending(registry);
	if (seed !== void 0) yield* Effect.promise(() => seed);
	const request = isRequestRegistry(registry);
	const source = sourceOf(atom);
	if (request && !Atom.isSerializable(source) && (yield* isDevelopment)) return yield* Effect.die(/* @__PURE__ */ new Error(`raf-effect-atom: a loader started ${String(atom)}, which isn't serializable and doesn't point at a serializable atom with initialValueTarget, so the browser would request it again. Give it a serialization key, such as AtomRpc's serializationKey option.`));
	const ttl = request ? void 0 : Duration.toMillis(yield* LeaseTTL);
	const target = hydrated(source);
	const key = keyOf(target);
	const existed = registry.getNodes().has(key) || Predicate.isString(key) && registry.preloadedSerializable.has(key);
	take(registry, target, ttl);
	return {
		existed,
		read: source === atom ? hydrated(atom) : atom,
		registry,
		request,
		target
	};
});
const isSettled = (result) => AsyncResult.isNotInitial(result) && !result.waiting;
const settled = (registry, atom, isDone) => Effect.callback((resume) => {
	const current = registry.get(atom);
	if (isDone(current)) {
		resume(Effect.succeed(current));
		return;
	}
	const cancel = registry.subscribe(atom, (value) => {
		if (isDone(value)) {
			cancel();
			resume(Effect.succeed(value));
		}
	});
	return Effect.sync(cancel);
}).pipe(Effect.flatMap(rejectDefects));
const rejectDefects = (result) => {
	if (AsyncResult.isFailure(result) && Option.isNone(Cause.findErrorOption(result.cause))) {
		const defects = result.cause;
		return Effect.failCause(defects);
	}
	return Effect.succeed(result);
};
/**
* Starts a source's atom without waiting for it, and returns its handle.
*
* **When to use**
*
* Use for data the route needs but its loader doesn't: it streams in while
* the route renders.
*
* **Details**
*
* - Starts the atom if it isn't in the registry, and leaves it alone if it
*   is. Takes a lease either way. The component that reads the handle
*   suspends until the result settles. On a request registry whose async
*   seed is still running, it waits for the seed first.
* - A derived atom that isn't serializable, such as an error boundary's
*   `wrap(source)`, starts the first serializable atom its
*   `initialValueTarget` chain points at, the one `useAtomResult` reads it
*   through: the lease, the handle's key and what the server sends are
*   that atom's. `ensure` and `fetch` wait for the derived atom's own
*   result.
*
* **Gotchas**
*
* The server sends a result still loading as a promise only when the atom
* it sends holds an `AsyncResult`. A derived atom whose serializable atom
* holds another value, such as an `Option` snapshot, crosses with the value
* it has when the registry is dehydrated: point it at an `AsyncResult`
* atom, or `ensure` it.
*
* **Example**
*
* ```ts
* import { Effect } from "effect"
* import { Loader } from "raf-effect-atom"
*
* const program = Loader.prefetch(commentPage, issueId, 0)
* ```
*
* @stability unstable
* @category verbs
* @since 0.1.0
*/
const prefetch = (source, ...args) => Effect.gen(function* () {
	const atom = atomOf(source, args);
	yield* start(atom);
	return make$1(args, atom);
});
/**
* Starts a source's atom in the browser, and returns its handle: on the
* server, it starts nothing, and the browser's read starts the atom.
*
* **When to use**
*
* Use for data only the browser can load: an input the server never sees,
* such as a token in the URL's fragment or a permission, or a request the
* server can't make. The rest of the page still renders on the server.
*
* **Details**
*
* - In the browser, it's `prefetch`: a loader that runs there, such as on a
*   client navigation, starts the atom and takes a lease.
* - On a request registry, it returns a handle marked `inBrowser` without
*   starting the atom, so the atom needs no serialization key. On the
*   server, `useAtomResult` throws for that handle, so React renders the
*   nearest Suspense boundary's fallback there and renders the boundary in
*   the browser. There, the read starts the atom, and the waterfall check
*   skips it, since a loader asked for it.
*
* **Gotchas**
*
* - Read the handle under a Suspense boundary: on the server, a read
*   outside one fails the whole render. React reports the boundary it
*   renders in the browser to `onRecoverableError`.
* - On a page the server rendered, the request starts when the browser
*   renders the read, after hydration's JavaScript has loaded: start the
*   data the server can load with `prefetch` or `ensure`.
*
* **Example**
*
* ```ts
* import { Loader } from "raf-effect-atom"
*
* const program = Loader.prefetchInBrowser(pushSubscription)
* ```
*
* @stability unstable
* @category verbs
* @since 0.2.6
*/
const prefetchInBrowser = (source, ...args) => Effect.gen(function* () {
	const atom = atomOf(source, args);
	if (isRequestRegistry(yield* AtomRegistry.AtomRegistry)) return inBrowser(args, atom);
	yield* start(atom);
	return make$1(args, atom);
});
const loaded = (args, atom, result) => {
	const handle = loaded$1(args, atom);
	results.set(handle, result);
	return handle;
};
/**
* Starts a source's atom, waits only while it has no result, and returns a
* handle whose reader renders without suspending.
*
* **When to use**
*
* Use when the loader needs the result, such as to redirect on a tag, or
* when the route shouldn't render without it.
*
* **Details**
*
* An atom with a result returns at once, without refetching. On a request
* registry, it also waits out a refresh in flight, so the server never
* renders a result that's about to change. A typed failure settles it like
* a success: `result` returns it. A defect or an interruption fails the
* Effect.
*
* **Example**
*
* ```ts
* import { Effect } from "effect"
* import { AsyncResult } from "effect/reactivity"
* import { Loader } from "raf-effect-atom"
*
* const program = Effect.gen(function* () {
*   const handle = yield* Loader.ensure(issue, 1)
*   const result = Loader.result(handle)
*   return AsyncResult.isSuccess(result) ? result.value.title : "missing"
* })
* ```
*
* @stability unstable
* @category verbs
* @since 0.1.0
*/
const ensure = (source, ...args) => Effect.gen(function* () {
	const atom = atomOf(source, args);
	const started = yield* start(atom);
	const result = yield* settled(started.registry, started.read, started.request ? isSettled : AsyncResult.isNotInitial);
	return loaded(args, atom, result);
});
/**
* Starts a source's atom, or refreshes it if it has a result, waits for the
* new result to settle, and returns a handle whose reader renders without
* suspending.
*
* **When to use**
*
* Use when the loader must not see a result from before it ran, such as
* after a mutation.
*
* **Details**
*
* Waits until the result settles and isn't refreshing. A typed failure
* settles it like a success: `result` returns it. A defect or an
* interruption fails the Effect.
*
* @stability unstable
* @category verbs
* @since 0.1.0
*/
const fetch = (source, ...args) => Effect.gen(function* () {
	const atom = atomOf(source, args);
	const started = yield* start(atom);
	const { read, registry, target } = started;
	if (started.existed && isSettled(registry.get(read))) {
		const node = registry.getNodes().get(keyOf(target));
		registry.refresh(read === target ? node?.atom ?? target : read);
	}
	const result = yield* settled(registry, read, isSettled);
	return loaded(args, atom, result);
});
const results = /* @__PURE__ */ new WeakMap();
/**
* Returns the settled result `ensure` or `fetch` waited for.
*
* **When to use**
*
* Use in the loader that ran the verb, to branch on the result: redirect on
* a tag, or build another atom's arguments from it. Components read the
* handle with `useAtomResult`, which follows the registry.
*
* **Gotchas**
*
* Only the handle object the verb returned has it: a handle that crossed
* the network, as loader data or a server component's prop, is a copy, and
* this throws for it.
*
* **Example**
*
* ```ts
* import { AsyncResult } from "effect/reactivity"
* import { Loader } from "raf-effect-atom"
*
* const handle = await atoms.ensure(issue, id)
* const error = AsyncResult.error(Loader.result(handle))
* ```
*
* @stability unstable
* @category getters
* @since 0.1.0
*/
const result = (handle) => {
	const settledResult = results.get(handle);
	if (settledResult === void 0) throw new Error("raf-effect-atom: Loader.result got a handle that no ensure or fetch returned here. Only the code that ran the verb has its result: a handle that crossed the network is a copy. Read it with useAtomResult instead.");
	return settledResult;
};
const runPromise = (effect, signal) => Effect.runPromise(effect, { signal }).catch((error) => {
	throw signal?.aborted ? signal.reason : error;
});
const either = (first, second) => first === void 0 || second === void 0 ? first ?? second : AbortSignal.any([first, second]);
/**
* Creates the Promise verbs over one registry.
*
* **When to use**
*
* Use in a framework integration, in loaders that are async functions, or
* in an event handler that starts an atom before the state change that
* renders its reader, for a choice a click or a submit makes that doesn't
* belong in the URL. In Effect code, use the verbs directly, and run
* the Effect on the registry with `run`.
*
* **Details**
*
* With a `signal`, an aborted request or navigation stops waiting: `ensure`,
* `fetch` and `run` reject with the signal's reason, and the atoms they
* started keep loading. The React Router and Next.js integrations pass the
* request's.
*
* **Example**
*
* ```ts
* import { Loader, RequestRegistry } from "raf-effect-atom"
*
* const loader = Loader.make(RequestRegistry.make(), { signal: request.signal })
* const comments = loader.prefetch(commentPage, 1, 0)
* const issueHandle = await loader.ensure(issue, 1)
* ```
*
* @stability unstable
* @category constructors
* @since 0.1.0
*/
const make = (registry, options) => {
	const leaseTTL = options?.leaseTTL === void 0 ? void 0 : Duration.fromInputUnsafe(options.leaseTTL);
	const signal = options?.signal;
	const provide = (effect) => {
		const provided = Effect.provideService(effect, AtomRegistry.AtomRegistry, registry);
		return leaseTTL === void 0 ? provided : Effect.provideService(provided, LeaseTTL, leaseTTL);
	};
	return {
		ensure: (source, ...args) => runPromise(provide(ensure(source, ...args)), signal),
		fetch: (source, ...args) => runPromise(provide(fetch(source, ...args)), signal),
		prefetch: (source, ...args) => {
			const atom = atomOf(source, args);
			afterSeed(registry, () => {
				Effect.runSync(provide(start(atom)));
			});
			return make$1(args, atom);
		},
		prefetchInBrowser: (source, ...args) => {
			const atom = atomOf(source, args);
			if (isRequestRegistry(registry)) return inBrowser(args, atom);
			afterSeed(registry, () => {
				Effect.runSync(provide(start(atom)));
			});
			return make$1(args, atom);
		},
		run: (effect, runOptions) => runPromise(provide(effect), either(signal, runOptions?.signal))
	};
};
export { LeaseTTL, Loader_exports, ensure, fetch, make, prefetch, prefetchInBrowser, result };
