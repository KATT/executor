import { createFileRoute } from "@tanstack/react-router";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { ApprovalsPage, loadApprovals } from "@executor-js/hosted-web/pages/approvals";

export const Route = createFileRoute("/org/$organizationSlug/approvals/")({
  loader: ({ context, params }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadApprovals(context.atoms, organization),
    ),
  component: ApprovalsRoute,
});

function ApprovalsRoute() {
  return <ApprovalsPage reads={Route.useLoaderData()} />;
}
