"use client";
import { HydrationBoundary } from "./ReactHydration.mjs";
import { jsx } from "react/jsx-runtime";
// src/NextClient.tsx
/**
* The client components of `raf-effect-atom/next`.
*
* @stability unstable
* @since 0.1.0
*/
/**
* Hydrates the state a server component dehydrated with `await dehydrate()`,
* streamed results included.
*
* **Details**
*
* React serializes the state's promises with the server component's
* payload, so a result still loading streams in when it settles, and
* `useAtomResult` waits for it instead of requesting it again.
*
* **Example**
*
* ```tsx
* import { dehydrate, ensure, HydrateAtoms } from "raf-effect-atom/next"
*
* export default async function IssuePage(props: { params: Promise<{ id: string }> }) {
*   const handle = await ensure(issue, Number((await props.params).id))
*   return (
*     <HydrateAtoms state={await dehydrate()}>
*       <Issue issue={handle} />
*     </HydrateAtoms>
*   )
* }
* ```
*
* @stability unstable
* @category components
* @since 0.1.0
*/
const HydrateAtoms = (props) => /* @__PURE__ */ jsx(HydrationBoundary, {
	state: props.state,
	children: props.children
});
export { HydrateAtoms };
