import { ErrorOf, Handle, Source, SuccessOf } from "./Handle.mjs";
import { SettledResult } from "./Loader.mjs";
import * as Atom from "effect/reactivity/Atom";
import * as AsyncResult from "effect/reactivity/AsyncResult";
/**
 * A source with the same arguments and success type as `S`, and any error:
 * the sources whose handles `S` reads, such as the source an error
 * boundary's `wrap(S)` wraps.
 */
type Readable<S> = S extends ((...args: infer Args) => Atom.Atom<AsyncResult.AsyncResult<infer A, infer _E>>) ? (...args: Args) => Atom.Atom<AsyncResult.AsyncResult<A, unknown>> : S extends Atom.Atom<AsyncResult.AsyncResult<infer A, infer _E>> ? Atom.Atom<AsyncResult.AsyncResult<A, unknown>> : never;
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
export declare const useAtomResult: <S extends Source>(source: S, handle: NoInfer<Handle<Readable<S>>>) => [ErrorOf<S>] extends [never] ? AsyncResult.Success<SuccessOf<S>, never> : SettledResult<SuccessOf<S>, ErrorOf<S>>;
export {};