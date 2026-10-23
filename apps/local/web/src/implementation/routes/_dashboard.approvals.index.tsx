import { createFileRoute } from "@tanstack/react-router";
import { ApprovalsPage, loadApprovals } from "../pages/approvals.tsx";

export const Route = createFileRoute("/_dashboard/approvals/")({
  staticData: { section: "approvals" },
  loader: ({ context }) => loadApprovals(context.atoms),
  component: ApprovalsRoute,
});

function ApprovalsRoute() {
  return <ApprovalsPage reads={Route.useLoaderData()} />;
}
