import { dehydrate } from "./Hydration.mjs";
import { isRequestRegistry, settled } from "./RequestRegistry.mjs";
import { HydrationBoundary as HydrationBoundary$1 } from "./ReactHydration.mjs";
import { jsx } from "react/jsx-runtime";
// src/ReactHydration.react-server.tsx
/**
* Sends a server component's request registry to the client components
* under it.
*
* **Details**
*
* With `registry`, it waits for the registry's seed, dehydrates the atoms
* started so far, and renders the client `HydrationBoundary` with that
* state. React serializes the state's promises with the payload, so a result
* still loading streams in when it settles. With `state`, it passes that
* state on.
*
* **Gotchas**
*
* Call the verbs before rendering it: each boundary sends what its registry
* held when it rendered. It throws for a registry that isn't a request
* registry, which every request would share.
*
* @stability unstable
* @category components
* @since 0.3.0
*/
const HydrationBoundary = async (props) => {
	const registry = props.registry;
	if (registry === void 0) return /* @__PURE__ */ jsx(HydrationBoundary$1, {
		state: props.state,
		children: props.children
	});
	if (!isRequestRegistry(registry)) throw new Error("raf-effect-atom: HydrationBoundary got a registry that isn't a request registry, which would share results between requests. Pass raf-effect-atom/rsc's getRegistry(), or one makeRequestAtoms made.");
	await settled(registry);
	return /* @__PURE__ */ jsx(HydrationBoundary$1, {
		state: dehydrate(registry),
		children: props.children
	});
};
export { HydrationBoundary };
