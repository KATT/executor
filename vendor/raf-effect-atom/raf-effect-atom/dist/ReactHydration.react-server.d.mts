import { HydrationBoundaryProps } from "./ReactHydration.mjs";
import * as React from "react";
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
export declare const HydrationBoundary: (props: HydrationBoundaryProps) => Promise<React.ReactNode>;