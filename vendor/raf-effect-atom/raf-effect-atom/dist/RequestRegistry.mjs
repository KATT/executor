import { __exportAll } from "./_virtual/_rolldown/runtime.mjs";
import { run, settled as settled$1 } from "./internal/seeds.mjs";
import * as Effect from "effect/Effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as Layer from "effect/Layer";
// src/RequestRegistry.ts
/**
* A registry per server request.
*
* `@effect/atom-react`'s default `RegistryContext` is one registry for the
* whole module, which on a server would share one user's results with every
* other request. Each framework integration makes a request registry with
* `make`, provides it through `RegistryContext`, and dehydrates it into the
* response.
*
* @stability unstable
* @since 0.1.0
*/
var RequestRegistry_exports = /* @__PURE__ */ __exportAll({
	isRequestRegistry: () => isRequestRegistry,
	layer: () => layer,
	make: () => make,
	settled: () => settled
});
const requestRegistries = /* @__PURE__ */ new WeakSet();
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
const make = (options) => {
	const registry = AtomRegistry.make();
	requestRegistries.add(registry);
	if (options?.seed !== void 0) run(registry, options.seed);
	return registry;
};
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
const settled = (registry) => settled$1(registry);
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
const layer = Layer.effect(AtomRegistry.AtomRegistry, Effect.acquireRelease(Effect.sync(() => make()), (registry) => Effect.sync(() => registry.dispose())));
/**
* Returns whether a registry was made by `make`, for one server request.
*
* @stability unstable
* @category guards
* @since 0.1.0
*/
const isRequestRegistry = (registry) => requestRegistries.has(registry);
export { RequestRegistry_exports, isRequestRegistry, layer, make, settled };
