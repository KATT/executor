import { make } from "./internal/next.mjs";
import { HydrateAtoms } from "./NextClient.mjs";
import { RegistryProvider } from "./RegistryProvider.mjs";
// src/Next.ts
/**
* Creates the verbs, `getRegistry` and `dehydrate` over a request registry
* that `seed` prepares.
*
* **When to use**
*
* Use when the request's atoms need something from the request before they
* run, such as an RPC protocol that forwards the page request's cookie. Make
* them once, in a server-only module, and call the verbs on them instead of
* the ones `raf-effect-atom/next` exports.
*
* **Details**
*
* The seed runs on each request's registry when a server component first
* uses it. It can be async, as `headers()` is: `ensure` and `fetch` wait
* for it, `prefetch` returns its handle at once and starts the atom once the
* seed resolves, and `dehydrate` waits for both.
*
* **Example**
*
* ```ts
* // src/atoms.server.ts
* import "server-only"
* import { headers } from "next/headers"
* import { makeRequestAtoms } from "raf-effect-atom/next"
*
* export const atoms = makeRequestAtoms({
*   seed: async (registry) => {
*     registry.set(requestCookie, (await headers()).get("cookie") ?? undefined)
*   }
* })
* ```
*
* @stability unstable
* @category constructors
* @since 0.2.0
*/
const makeRequestAtoms = make;
const atoms = make();
/**
* Returns the request registry of the server render in progress.
*
* **Details**
*
* Made once per request through React's `cache`, and disposed through
* `cacheSignal` when React finishes the render, after the last streamed
* result has been sent. The verbs take the same signal: when React aborts
* the render, such as for a navigation the browser left, the `ensure` and
* `fetch` calls still waiting reject with its reason.
*
* **Gotchas**
*
* Only server components share it: outside a server component render,
* `cache` doesn't cache, so each call makes a new registry.
*
* @stability unstable
* @category registry
* @since 0.1.0
*/
const getRegistry = atoms.getRegistry;
/**
* `Loader.prefetch` on the request's registry: starts a source's atom, to
* stream it, and returns its handle.
*
* @stability unstable
* @category verbs
* @since 0.1.0
*/
const prefetch = atoms.prefetch;
/**
* `Loader.ensure` on the request's registry: starts a source's atom, waits
* for its result, and returns its handle.
*
* @stability unstable
* @category verbs
* @since 0.1.0
*/
const ensure = atoms.ensure;
/**
* `Loader.fetch` on the request's registry: starts or refreshes a source's
* atom, waits for the new result, and returns its handle.
*
* @stability unstable
* @category verbs
* @since 0.1.0
*/
const fetch = atoms.fetch;
/**
* `Hydration.dehydrate` on the request's registry, for `HydrateAtoms`.
*
* **Gotchas**
*
* Includes the atoms started so far, so call it after the server component's
* verbs. Each `HydrateAtoms` hydrates what its own `dehydrate()` saw.
*
* **Example**
*
* ```tsx
* <HydrateAtoms state={await dehydrate()}>
*   <Issue issue={handle} />
* </HydrateAtoms>
* ```
*
* @stability unstable
* @category dehydration
* @since 0.1.0
*/
const dehydrate = atoms.dehydrate;
export { HydrateAtoms, RegistryProvider, dehydrate, ensure, fetch, getRegistry, makeRequestAtoms, prefetch };
