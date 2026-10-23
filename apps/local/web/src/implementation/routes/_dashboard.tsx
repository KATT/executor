import { createFileRoute } from "@tanstack/react-router";
import { overviewAtom } from "../../contracts/api.ts";
import { ownerMigrationAtom } from "../../contracts/owner-migration.ts";
import { DashboardLayout } from "../app.tsx";
import { NotFoundPage } from "../components/not-found.tsx";
/** Generated-tree route for /_dashboard. */
export const Route = createFileRoute("/_dashboard")({
  loader: ({ context }) => ({
    overview: context.atoms.prefetch(overviewAtom),
    migration: context.atoms.prefetch(ownerMigrationAtom),
  }),
  notFoundComponent: NotFoundPage,
  component: DashboardLayout,
});
