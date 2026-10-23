import { createFileRoute } from "@tanstack/react-router";
import { ScheduledApprovalPage, loadScheduledReview } from "../pages/approvals.tsx";

export const Route = createFileRoute("/_dashboard/approvals/$runId")({
  staticData: { section: "approvals" },
  loader: ({ context, params }) => loadScheduledReview(context.atoms, params.runId),
  component: Review,
});

function Review() {
  const { runId } = Route.useParams();
  return <ScheduledApprovalPage runId={runId} view={Route.useLoaderData().view} />;
}
