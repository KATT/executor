import { createFileRoute } from "@tanstack/react-router";
import { ApprovalCardPending } from "@executor-js/ui/dashboard/loading";
import { loadLocalApproval, McpApprovePage } from "../pages/mcp-approve.tsx";
export const Route = createFileRoute("/mcp/approve/$requestId")({
  loader: ({ context, params, location }) =>
    loadLocalApproval(context.atoms, params.requestId, location.searchStr),
  pendingComponent: ApprovalCardPending,
  component: function Approve() {
    return <McpApprovePage reads={Route.useLoaderData()} />;
  },
});
