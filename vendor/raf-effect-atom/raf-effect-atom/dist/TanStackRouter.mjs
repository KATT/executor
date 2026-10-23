import { dehydrate, hydrate } from "./Hydration.mjs";
import { isRequestRegistry, settled } from "./RequestRegistry.mjs";
import { make } from "./internal/registry.mjs";
import * as Predicate from "effect/Predicate";
import { RegistryContext } from "@effect/atom-react";
import * as React from "react";
import { jsx } from "react/jsx-runtime";
// src/TanStackRouter.tsx
/**
* Connects the loader verbs to TanStack Router and TanStack Start.
*
* `getRouter` runs once per request on the server and once in the browser.
* It makes the registry with `makeRegistry`, puts `Loader.make(registry)` on
* the router context for the loaders, and calls `setupRouterAtoms`, which
* provides the registry to the app and sends it from the server to the
* browser through the router's own dehydration.
*
* **Example**
*
* ```tsx
* import { createRouter } from "@tanstack/react-router"
* import { Loader } from "raf-effect-atom"
* import { makeRegistry, setupRouterAtoms } from "raf-effect-atom/tanstack-router"
*
* export function getRouter() {
*   const registry = makeRegistry()
*   const router = createRouter({
*     routeTree,
*     context: { atoms: Loader.make(registry) }
*   })
*   setupRouterAtoms({ router, registry })
*   return router
* }
* ```
*
* @stability unstable
* @since 0.1.0
*/
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
* - `initialValues` are values both registries start with, as
*   `AtomRegistry.make`'s `initialValues`, such as the session the server
*   verified or a readable atom that provides the request's `fetch`. The
*   server's request registry keeps those atoms mounted until it's disposed.
*   The browser's registry drops an atom no component reads, value included,
*   so make one whose value must outlive its readers `Atom.keepAlive`.
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
const makeRegistry = (options) => make(options);
const hasRouterAtoms = (value) => Predicate.hasProperty(value, "raf-effect-atom") && Array.isArray(value["raf-effect-atom"]);
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
const setupRouterAtoms = (options) => {
	const router = options.router;
	const registry = options.registry;
	if (router.isServer !== isRequestRegistry(registry)) throw new Error(router.isServer ? "raf-effect-atom: setupRouterAtoms got a server router without a request registry, which would share results between requests. Make it with makeRegistry or RequestRegistry.make." : "raf-effect-atom: setupRouterAtoms got a browser router with a request registry. Make it with makeRegistry or AtomRegistry.make.");
	const Wrap = router.options.Wrap ?? React.Fragment;
	router.options.Wrap = (props) => /* @__PURE__ */ jsx(RegistryContext.Provider, {
		value: registry,
		children: /* @__PURE__ */ jsx(Wrap, { children: props.children })
	});
	if (router.isServer) {
		let disposed = false;
		router.serverSsrLifecycle = {
			...router.serverSsrLifecycle,
			onServerSsrAttach: [...router.serverSsrLifecycle?.onServerSsrAttach ?? [], (serverSsr) => {
				serverSsr.onCleanup(() => {
					disposed = true;
					registry.dispose();
				});
			}]
		};
		const dehydrate$1 = router.options.dehydrate;
		router.options.dehydrate = async () => {
			const dehydrated = await dehydrate$1?.();
			await settled(registry);
			if (disposed) return dehydrated;
			const atoms = { "raf-effect-atom": dehydrate(registry) };
			return Predicate.isObject(dehydrated) ? {
				...dehydrated,
				...atoms
			} : atoms;
		};
	} else {
		const hydrate$1 = router.options.hydrate;
		router.options.hydrate = async (dehydrated) => {
			await hydrate$1?.(dehydrated);
			if (hasRouterAtoms(dehydrated)) hydrate(registry, dehydrated["raf-effect-atom"]);
		};
	}
};
export { makeRegistry, setupRouterAtoms };
