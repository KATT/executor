import { ArgsOf, ErrorOf, Handle, LoadedHandle, Source, SuccessOf } from "./Handle.mjs";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
declare namespace Loader_d_exports {
  export { LeaseTTL, Loader, MakeOptions, SettledResult, ensure, fetch, make, prefetch, prefetchInBrowser, result };
}
/**
 * A settled `AsyncResult`: what `ensure` and `fetch` return.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export type SettledResult<A, E> = AsyncResult.Failure<A, E> | AsyncResult.Success<A, E>;
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
export declare const LeaseTTL: Context.Reference<Duration.Duration>;
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
export declare const prefetch: <S extends Source>(source: S, ...args: ArgsOf<S>) => Effect.Effect<Handle<S>, never, AtomRegistry.AtomRegistry>;
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
export declare const prefetchInBrowser: <S extends Source>(source: S, ...args: ArgsOf<S>) => Effect.Effect<Handle<S>, never, AtomRegistry.AtomRegistry>;
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
export declare const ensure: <S extends Source>(source: S, ...args: ArgsOf<S>) => Effect.Effect<LoadedHandle<S>, never, AtomRegistry.AtomRegistry>;
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
export declare const fetch: <S extends Source>(source: S, ...args: ArgsOf<S>) => Effect.Effect<LoadedHandle<S>, never, AtomRegistry.AtomRegistry>;
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
export declare const result: <S extends Source>(handle: LoadedHandle<S>) => SettledResult<SuccessOf<S>, ErrorOf<S>>;
/**
 * The loader verbs as Promises over one registry, as the framework
 * integrations put them on the router context.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export interface Loader {
  /** {@link ensure}, as a Promise that rejects only on a defect. */
  readonly ensure: <S extends Source>(source: S, ...args: ArgsOf<S>) => Promise<LoadedHandle<S>>;
  /** {@link fetch}, as a Promise that rejects only on a defect. */
  readonly fetch: <S extends Source>(source: S, ...args: ArgsOf<S>) => Promise<LoadedHandle<S>>;
  /**
   * {@link prefetch}, run at once. On a request registry whose async seed is
   * still running, it returns the handle at once and starts the atom once
   * the seed resolves.
   */
  readonly prefetch: <S extends Source>(source: S, ...args: ArgsOf<S>) => Handle<S>;
  /** {@link prefetchInBrowser}, run at once. */
  readonly prefetchInBrowser: <S extends Source>(source: S, ...args: ArgsOf<S>) => Handle<S>;
  /**
   * Runs an Effect that needs the registry, such as the Effect verbs in an
   * `Effect.gen`, as a Promise that rejects with its squashed cause.
   * Aborting `signal`, or the one the verbs were made with, interrupts it,
   * and the Promise rejects with the abort reason.
   */
  readonly run: <A, E>(effect: Effect.Effect<A, E, AtomRegistry.AtomRegistry>, options?: {
    readonly signal?: AbortSignal | undefined;
  }) => Promise<A>;
}
/**
 * Options for `make`.
 *
 * @stability unstable
 * @category models
 * @since 0.2.2
 */
export interface MakeOptions {
  /** How long a lease lasts in the browser. See {@link LeaseTTL}. */
  readonly leaseTTL?: Duration.Input | undefined;
  /**
   * The request's or the navigation's abort signal. Aborting it interrupts
   * the `ensure`, `fetch` and `run` calls still waiting, which reject with
   * its reason. The atoms they started keep loading.
   */
  readonly signal?: AbortSignal | undefined;
}
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
export declare const make: (registry: AtomRegistry.AtomRegistry, options?: MakeOptions) => Loader;
export { Loader_d_exports };