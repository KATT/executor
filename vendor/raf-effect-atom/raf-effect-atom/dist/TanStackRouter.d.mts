import { Seed } from "./RequestRegistry.mjs";
import * as EffectHydration from "effect/reactivity/Hydration";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { AnyRouter } from "@tanstack/react-router";
/**
 * The key `setupRouterAtoms` adds to the router's dehydrated state.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export interface DehydratedRouterAtoms {
  readonly "raf-effect-atom": ReadonlyArray<EffectHydration.DehydratedAtom>;
}
/**
 * Options for `setupRouterAtoms`.
 *
 * @stability unstable
 * @category models
 * @since 0.1.0
 */
export interface RouterAtomsOptions<TRouter extends AnyRouter> {
  /** The registry the router context's loader verbs run on. */
  readonly registry: AtomRegistry.AtomRegistry;
  readonly router: TRouter;
}
/**
 * Creates the registry for one `getRouter` call: a request registry on the
 * server, and in the browser a registry like `@effect/atom-react`'s
 * `RegistryProvider` makes.
 *
 * **Details**
 *
 * - The server is anywhere without a `window`. To decide otherwise, make
 *   the registry with `RequestRegistry.make` on the server and
 *   `AtomRegistry.make` in the browser.
 * - `defaultIdleTTL` is how many milliseconds the browser's registry keeps
 *   an atom no component reads, 400 by default, as `@effect/atom-react`'s
 *   default registry does. An atom's own `Atom.setIdleTTL` or
 *   `Atom.keepAlive` wins. The server's request registry lives for one
 *   request, so it has none.
 * - `seed` runs on the server's request registry before the loaders start
 *   atoms in it, as `RequestRegistry.make`'s does: set what the request's
 *   atoms need, such as its cookie. It can be async. The browser's registry
 *   isn't seeded.
 *
 * **Example**
 *
 * ```ts
 * import { getRequestHeader } from "@tanstack/react-start/server"
 * import { makeRegistry } from "raf-effect-atom/tanstack-router"
 *
 * const registry = makeRegistry({
 *   // Keeps an issue the user navigated away from for a minute.
 *   defaultIdleTTL: 60_000,
 *   // In-process RPC calls send the page request's cookie.
 *   seed: (registry) => registry.set(requestCookie, getRequestHeader("cookie"))
 * })
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 0.1.0
 */
export declare const makeRegistry: (options?: {
  readonly defaultIdleTTL?: number | undefined;
  readonly seed?: Seed | undefined;
}) => AtomRegistry.AtomRegistry;
/**
 * Provides a registry to a TanStack router's app and streams it from the
 * server to the browser.
 *
 * **Details**
 *
 * - Wraps the app in `RegistryContext.Provider` through the router's `Wrap`
 *   option, inside any `Wrap` it has already.
 * - On the server, adds `Hydration.dehydrate(registry)` to the router's
 *   dehydrated state once the loaders have run, so results still loading
 *   cross as promises on the router's stream, and disposes the registry when
 *   the response finishes.
 * - In the browser, hydrates the registry from that state before the app
 *   renders.
 *
 * **Gotchas**
 *
 * The server's registry must be a request registry and the browser's must
 * not, so it throws otherwise: a registry shared between requests would send
 * one user's results to another. Only atoms in the registry when the loaders
 * finish are sent; one first read while rendering runs again in the browser.
 *
 * @stability unstable
 * @category integrations
 * @since 0.1.0
 */
export declare const setupRouterAtoms: <TRouter extends AnyRouter>(options: RouterAtomsOptions<TRouter>) => void;