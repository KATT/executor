import { createFileRoute } from "@tanstack/react-router";
import { overviewSnapshotAtom } from "../../contracts/api.ts";
import { prefetchLiveSnapshot } from "../../contracts/live-prefetch.ts";
import { InventoryLayout } from "../inventory.tsx";
/** Generated-tree route for /_dashboard/_inventory. */
export const Route = createFileRoute("/_dashboard/_inventory")({
  loader: ({ context }) => ({
    overview: prefetchLiveSnapshot(context.atoms, overviewSnapshotAtom),
  }),
  component: InventoryLayout,
});
