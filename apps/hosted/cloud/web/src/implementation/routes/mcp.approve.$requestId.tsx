import { createFileRoute } from "@tanstack/react-router";
import { loadHostedApproval, McpApprovePage } from "@executor-js/hosted-web/pages/mcp-approve";
import { ApprovalCardPending } from "@executor-js/ui/dashboard/loading";
export const Route = createFileRoute("/mcp/approve/$requestId")({
  loader: ({ context, params, location }) =>
    loadHostedApproval(context.atoms, params.requestId, location.searchStr),
  pendingComponent: ApprovalCardPending,
  component: function Approve() {
    return <McpApprovePage reads={Route.useLoaderData()} />;
  },
});
