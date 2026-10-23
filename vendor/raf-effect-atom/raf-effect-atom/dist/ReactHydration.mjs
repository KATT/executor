"use client";
import { split } from "./internal/pending.mjs";
import { sourceOf } from "./internal/sources.mjs";
import { isServer, requireRequestRegistry } from "./internal/registry.mjs";
import { HydrationBoundary, RegistryContext } from "@effect/atom-react";
import * as React from "react";
import { jsx } from "react/jsx-runtime";
// src/ReactHydration.tsx
/**
* Applies a server registry's dehydrated state to the nearest
* `RegistryContext`, while rendering.
*
* @stability unstable
* @since 0.1.0
*/
/**
* Hydrates the state a server registry dehydrated, streamed results
* included.
*
* **When to use**
*
* Use where the server's state reaches the React tree through rendering
* rather than a router: a server component's registry, or a React Router
* loader's data. A router that hydrates before rendering calls
* `Hydration.hydrate` instead.
*
* **Details**
*
* In a server component, pass the request's `registry`. Server components
* get their own build of `HydrationBoundary` through the package's
* `react-server` export condition: it waits for the registry's seed,
* dehydrates it, and sends the state with the server component's payload,
* so results still loading stream in as they settle.
*
* Anywhere else, pass the `state` a loader dehydrated. Settled values go to
* `@effect/atom-react`'s `HydrationBoundary`, which hydrates new atoms
* during render and existing ones after commit. Each streamed result is
* held until it arrives, so `useAtomResult` waits for it instead of
* requesting it again.
*
* During server rendering, when `state` is the array `dehydrate` returned,
* as React Router passes a loader's data to the server render, the children
* read the registry it came from instead of a copy. The loaders' atoms are
* there, so an `effect-atom-boundary` boundary sees their failures before
* its children read them and renders its handler on the server.
*
* **Gotchas**
*
* `registry` works only in server components: in a client component it
* throws, since a registry can't cross to the browser. In development, it
* throws during server rendering when the registry isn't a request
* registry, such as `@effect/atom-react`'s default one, which every request
* shares: one request's state would reach the others.
*
* **Example**
*
* ```tsx
* import { HydrationBoundary } from "raf-effect-atom"
* import { ensure, getRegistry } from "raf-effect-atom/rsc"
*
* // A server component
* export default async function IssueRoute(props: { params: Promise<{ id: string }> }) {
*   const handle = await ensure(issue, Number((await props.params).id))
*   return (
*     <HydrationBoundary registry={getRegistry()}>
*       <IssuePage issue={handle} />
*     </HydrationBoundary>
*   )
* }
*
* // A React Router route component
* <HydrationBoundary state={loaderData.atoms}>
*   <IssuePage issue={loaderData.issue} />
* </HydrationBoundary>
* ```
*
* @stability unstable
* @category components
* @since 0.1.0
*/
const HydrationBoundary$1 = (props) => {
	if (props.registry !== void 0) throw new Error("raf-effect-atom: HydrationBoundary needs `state` here. `registry` works only in server components.");
	const context = React.useContext(RegistryContext);
	const state = props.state;
	const source = isServer() ? sourceOf(state) : void 0;
	const registry = source ?? context;
	requireRequestRegistry(registry, "HydrationBoundary");
	const settled = React.useMemo(() => state === void 0 || source !== void 0 ? void 0 : split(registry, state), [
		registry,
		source,
		state
	]);
	return /* @__PURE__ */ jsx(RegistryContext.Provider, {
		value: registry,
		children: /* @__PURE__ */ jsx(HydrationBoundary, {
			state: settled,
			children: props.children
		})
	});
};
export { HydrationBoundary$1 as HydrationBoundary };
