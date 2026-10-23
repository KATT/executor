import * as Atom from "effect/reactivity/Atom";
import * as EffectHydration from "effect/reactivity/Hydration";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
declare namespace Hydration_d_exports {
  export { dehydrate, hydrate, hydrated };
}
/**
 * Returns a serializable atom that keeps its hydrated value on its first
 * read, instead of running its effect again.
 *
 * **When to use**
 *
 * The loader verbs and `useAtomResult` already read through it. Use it when
 * reading a hydrated atom with `@effect/atom-react`'s own hooks.
 *
 * **Details**
 *
 * The copy shares the atom's serialization key, so both read the same
 * registry node. It sets `skipInitialRun` on the atom's `Serializable`
 * metadata, and is memoized per atom, so every call returns the same copy.
 * An atom that isn't serializable, or already skips its initial run, is
 * returned as it is.
 *
 * **Gotchas**
 *
 * The copy keeps the hydrated value only for the first read: a refresh, or a
 * change to a dependency, runs the effect as usual. An `Initial` value never
 * skips the effect, which is why a result the server was still loading
 * crosses as a promise that `useAtomResult` waits for.
 *
 * **Example**
 *
 * ```ts
 * import { useAtomValue } from "@effect/atom-react"
 * import { Hydration } from "raf-effect-atom"
 *
 * const result = useAtomValue(Hydration.hydrated(issue(1)))
 * ```
 *
 * @see {@link Atom.serializable} for the metadata it copies
 *
 * @stability unstable
 * @category combinators
 * @since 0.1.0
 */
export declare const hydrated: <Self extends Atom.Atom<unknown>>(atom: Self) => Self;
/**
 * Encodes a request registry's serializable atoms for the browser.
 *
 * **Details**
 *
 * `Hydration.dehydrate` with `encodeInitialAs: "promise"`: a settled result
 * crosses as its encoded value, and a result still loading crosses as a
 * promise of its encoded value, which resolves when it settles. The
 * framework's serializer carries the promises (TanStack Router's dehydrated
 * state, React's server component props, React Router's Single Fetch).
 *
 * **Gotchas**
 *
 * Only atoms in the registry when it's called are included, so call it once
 * the loaders have started theirs.
 *
 * @see {@link hydrate} for the browser side
 *
 * @stability unstable
 * @category dehydration
 * @since 0.1.0
 */
export declare const dehydrate: (registry: AtomRegistry.AtomRegistry) => Array<EffectHydration.DehydratedAtom>;
/**
 * Applies dehydrated state to the browser's registry.
 *
 * **When to use**
 *
 * Use outside React, such as in a router's `hydrate` hook, before the app
 * renders. Inside React, use `HydrationBoundary`.
 *
 * **Details**
 *
 * Settled values go through `Hydration.hydrate`. A streamed result is held
 * until its promise resolves, then hydrated; until then `useAtomResult`
 * suspends on it instead of starting the atom, which would request it again.
 * A streamed result that can't be decoded, or whose promise rejects, is
 * dropped, and the atom runs in the browser.
 *
 * @see {@link dehydrate} for the server side
 *
 * @stability unstable
 * @category hydration
 * @since 0.1.0
 */
export declare const hydrate: (registry: AtomRegistry.AtomRegistry, state: Iterable<EffectHydration.DehydratedAtom>) => void;
export { Hydration_d_exports };