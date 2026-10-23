import { HydrationBoundaryProps } from "./ReactHydration.mjs";
import * as React from "react";
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
export declare const HydrateAtoms: (props: HydrationBoundaryProps) => React.ReactNode;