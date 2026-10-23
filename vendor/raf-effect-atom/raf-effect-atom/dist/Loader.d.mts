import { ArgsOf, ErrorOf, Handle, LoadedHandle, Source, SuccessOf } from "./Handle.mjs";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
declare namespace Loader_d_exports {
  export { LeaseTTL, Loader, MakeOptions, SettledResult, ensure, fetch, make, prefetch, result };
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
 * Starts the atom if it isn't in the registry, and leaves it alone if it is.
 * Takes a lease either way. The component that reads the handle suspends
 * until the result settles. On a request registry whose async seed is still
 * running, it waits for the seed first.
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
}
/**
 * Options for `make`.
 *
 * @stability unstable
 * @category models
 * @since 0.3.0
 */
export interface MakeOptions {
  /** How long a lease lasts in the browser. See {@link LeaseTTL}. */
  readonly leaseTTL?: Duration.Input | undefined;
  /**
   * The request's or the navigation's abort signal. Aborting it interrupts
   * the `ensure` and `fetch` calls still waiting, which reject with its
   * reason. The atoms they started keep loading.
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
 * renders its reader, for state that can't be in the URL, such as a
 * search-as-you-type query. In Effect code, use the verbs directly with the
 * `AtomRegistry` provided.
 *
 * **Details**
 *
 * With a `signal`, an aborted request or navigation stops waiting: `ensure`
 * and `fetch` reject with the signal's reason, and the atoms they started
 * keep loading. The React Router and Next.js integrations pass the
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