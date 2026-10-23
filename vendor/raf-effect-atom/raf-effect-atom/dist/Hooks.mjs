"use client";
import { stream } from "./internal/pending.mjs";
import { hydrated } from "./Hydration.mjs";
import { keyOf, release } from "./internal/leases.mjs";
import { atomOf } from "./internal/handles.mjs";
import { requireRequestRegistry } from "./internal/registry.mjs";
import { ModeContext, check } from "./internal/waterfalls.mjs";
import * as Atom from "effect/reactivity/Atom";
import * as Predicate from "effect/Predicate";
import * as Cause from "effect/Cause";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { RegistryContext, useAtomSuspense } from "@effect/atom-react";
import * as React from "react";
// src/Hooks.ts
/**
* The read hook for atoms started by loaders and streamed from the server.
*
* @stability unstable
* @since 0.1.0
*/
/**
* The atom the loader started and the server sent: the first serializable
* atom in `atom`'s `initialValueTarget` chain, starting with `atom`. An
* AtomRpc query is serializable itself, though it points at an inner atom.
*/
const sourceOf = (atom) => {
	for (let target = atom; target !== void 0; target = target.initialValueTarget) if (Atom.isSerializable(target)) return target;
	return atom;
};
/**
* Reads a handle through React Suspense, through the source that made it: a
* result streamed from the server, a hydrated one, or one a loader started.
*
* **When to use**
*
* Use in the component a loader, a server component or `useWaterfall` gave
* the handle to. The source can be the one the verb started, or one derived
* from it whose atoms point at its atoms with `initialValueTarget`, such as
* an error boundary's `wrap(source)`.
*
* **Details**
*
* - The atom is `source(...handle.args)`, or `source` itself for an atom.
*   In development, the read throws when the atom it hydrates has another
*   serialization key than the handle's: the handle came from another
*   source.
* - A handle from `ensure` or `fetch` renders without suspending, unless
*   the registry dropped the result since; one from `prefetch` or
*   `useWaterfall` suspends until the result settles. The registry is the
*   source of truth either way: the read follows refreshes and mutations.
* - A result the server was still loading when it dehydrated is awaited
*   instead of started, so the browser doesn't request it a second time.
* - The atom is read through `hydrated`, so a hydrated result is kept.
* - Once the component mounts, the loader's lease ends and the component
*   keeps the atom mounted.
* - A derived atom is read through the first serializable atom its
*   `initialValueTarget` chain points at: that one is awaited, hydrated and
*   released, so the derived atom doesn't request it again.
* - The settled result is returned, typed failures included. A defect is
*   thrown to the error boundaries above. With no typed failures left, such
*   as an atom whose boundaries claim all of them, it's typed as a success.
* - While a failed atom refreshes, such as after a boundary's `reset`, the
*   read suspends instead of returning the old failure again.
*
* **Gotchas**
*
* A read of an atom that nothing started, such as one whose loader result the
* registry dropped, starts it, and its request waits for the render: a
* request waterfall. In development, the read reports it as
* `WaterfallDetection` says, by default with a warning. Start the atom in a
* loader or a server component, with the state that picks it in the URL,
* and pass its handle down. For state that can't be in the URL, start it in
* the event handler that changes the state, or make its handle with
* `useWaterfall` when only the render knows its input.
*
* Two sources with the same arguments and success type take each other's
* handles as far as the types go; the development check catches it.
*
* During server rendering, the registry must be a request registry (see
* `RequestRegistry.make`), or a module-level registry would share results
* between requests: in development, the hook throws without one.
*
* `Atom.transform`'s `initialValueTarget` option points at the end of the
* target's own chain, which for an AtomRpc query with `reactivityKeys` is an
* inner atom with no serialization key. A derived atom read here sets
* `initialValueTarget` to its source itself, as an error boundary's
* wrapper does, or it requests the source again after hydration.
*
* **Example**
*
* ```tsx
* import { AsyncResult } from "effect/reactivity"
* import { type Handle, useAtomResult } from "raf-effect-atom"
*
* function IssueTitle(props: { readonly issue: Handle<typeof issue> }) {
*   const result = useAtomResult(issue, props.issue)
*   return AsyncResult.isSuccess(result) ? <h1>{result.value.title}</h1> : null
* }
* ```
*
* @see {@link hydrated} for reading hydrated atoms with Atom's own hooks
*
* @stability unstable
* @category hooks
* @since 0.1.0
*/
const useAtomResult = (source, handle) => {
	const registry = React.useContext(RegistryContext);
	const atom = atomOf(source, handle.args);
	requireRequestRegistry(registry, "useAtomResult");
	const target = sourceOf(atom);
	const started = hydrated(target);
	const read = target === atom ? hydrated(atom) : atom;
	const key = keyOf(started);
	if (process.env.NODE_ENV !== "production" && handle.key !== void 0 && Predicate.isString(key) && handle.key !== key) throw new Error(`raf-effect-atom: useAtomResult read the handle of ${handle.key} through a source that makes ${key}. Read a handle through the source that made it.`);
	const streamed = Predicate.isString(key) ? stream(registry, key) : void 0;
	if (streamed !== void 0) React.use(streamed);
	if (process.env.NODE_ENV !== "production") check(registry, started, React.use(ModeContext));
	if (read !== started) registry.get(started);
	const current = registry.get(read);
	const result = useAtomSuspense(read, {
		includeFailure: true,
		suspendOnWaiting: AsyncResult.isFailure(current) && current.waiting
	});
	React.useEffect(() => {
		release(registry, started);
	}, [registry, started]);
	if (AsyncResult.isFailure(result) && Option.isNone(Cause.findErrorOption(result.cause))) throw Cause.squash(result.cause);
	return result;
};
export { useAtomResult };
