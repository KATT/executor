import { Seed as Seed$1 } from "./internal/seeds.mjs";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as Layer from "effect/Layer";
declare namespace RequestRegistry_d_exports {
  export { Options, Seed, isRequestRegistry, layer, make, settled };
}
/**
 * Prepares a request registry before the loader verbs start atoms in it,
 * such as by setting an atom to the request's cookie.
 *
 * @stability unstable
 * @category models
 * @since 0.2.0
 */
export type Seed = Seed$1;
/**
 * Options for `make`.
 *
 * @stability unstable
 * @category models
 * @since 0.2.0
 */
export interface Options {
  /**
   * Runs on the new registry before any verb starts an atom in it. When it
   * returns a promise, `ensure` and `fetch` wait for it, and `prefetch`
   * returns its handle at once and starts the atom once it resolves.
   */
  readonly seed?: Seed | undefined;
}
/**
 * Creates the registry for one server request.
 *
 * **Details**
 *
 * - It's an ordinary `AtomRegistry`, marked as a request registry. On a
 *   request registry, `ensure` waits like `fetch` does, nothing revalidates
 *   in the background, and a loader's lease lasts until the registry is
 *   disposed. In development, the loader verbs refuse an atom that isn't
 *   serializable, because the browser would request it again.
 * - `seed` sets what the request's atoms need before they run, such as the
 *   page request's cookie for an RPC protocol that forwards it. It can be
 *   async, for request data only a promise gives, such as Next.js's
 *   `headers()`.
 *
 * **Gotchas**
 *
 * With an async seed, a `prefetch` before it settles starts its atom later,
 * so `Hydration.dehydrate` would miss it: wait for `settled` first, as the
 * framework integrations do.
 *
 * **Example**
 *
 * ```ts
 * import { RequestRegistry } from "raf-effect-atom"
 *
 * const registry = RequestRegistry.make({
 *   seed: (registry) => registry.set(requestCookie, request.headers.get("cookie") ?? undefined)
 * })
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 0.1.0
 */
export declare const make: (options?: Options) => AtomRegistry.AtomRegistry;
/**
 * Waits until a request registry's seed has settled and every atom a verb
 * started while it ran has started.
 *
 * **When to use**
 *
 * Use before `Hydration.dehydrate` on a registry with an async seed, outside
 * the framework integrations, which call it for you.
 *
 * **Details**
 *
 * Resolves at once for a registry without a seed, or whose seed was
 * synchronous. Rejects with the seed's error.
 *
 * @stability unstable
 * @category getters
 * @since 0.2.0
 */
export declare const settled: (registry: AtomRegistry.AtomRegistry) => Promise<void>;
/**
 * A layer that provides a request registry as the `AtomRegistry`, disposed
 * when the layer's scope closes.
 *
 * **When to use**
 *
 * Use when the request is handled in Effect, around the loaders' verbs and
 * `dehydrate`.
 *
 * @see {@link make} for the registry it provides
 *
 * @stability unstable
 * @category layers
 * @since 0.1.0
 */
export declare const layer: Layer.Layer<AtomRegistry.AtomRegistry>;
/**
 * Returns whether a registry was made by `make`, for one server request.
 *
 * @stability unstable
 * @category guards
 * @since 0.1.0
 */
export declare const isRequestRegistry: (registry: AtomRegistry.AtomRegistry) => boolean;
export { RequestRegistry_d_exports };