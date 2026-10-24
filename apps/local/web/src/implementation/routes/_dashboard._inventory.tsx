import { createFileRoute } from "@tanstack/react-router";
import { overviewAtom } from "../../contracts/api.ts";
import { InventoryLayout } from "../inventory.tsx";
/** Generated-tree route for /_dashboard/_inventory. */
export const Route = createFileRoute("/_dashboard/_inventory")({
  loader: ({ context }) => ({
    overview: context.atoms.prefetch(overviewAtom),
  }),
  component: InventoryLayout,
});
