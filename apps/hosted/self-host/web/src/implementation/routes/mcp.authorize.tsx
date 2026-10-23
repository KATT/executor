import { createFileRoute } from "@tanstack/react-router";
import { McpConsentLoading } from "@executor-js/ui/dashboard/mcp-consent";
import {
  McpAuthorizePage,
  loadMcpAuthorization,
} from "@executor-js/hosted-web/pages/mcp-authorize";

export const Route = createFileRoute("/mcp/authorize")({
  loader: ({ context, location }) => loadMcpAuthorization(context.atoms, location.searchStr),
  component: () => <McpAuthorizePage reads={Route.useLoaderData()} />,
  // The consent page's own loading view, while the client and memberships load.
  pendingComponent: McpConsentLoading,
});
