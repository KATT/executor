import { createFileRoute } from "@tanstack/react-router";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import {
  ScheduledApprovalPage,
  loadScheduledReview,
} from "@executor-js/hosted-web/pages/approvals";

export const Route = createFileRoute("/org/$organizationSlug/approvals/$runId")({
  loader: ({ context, params }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadScheduledReview(context.atoms, organization, params.runId),
    ),
  component: Review,
});

function Review() {
  const { runId } = Route.useParams();
  return <ScheduledApprovalPage runId={runId} view={Route.useLoaderData()?.view} />;
}
