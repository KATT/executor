import { createFileRoute } from "@tanstack/react-router";
import { McpConsentLoading } from "@executor-js/ui/dashboard/mcp-consent";
import { localMcpClientAtom } from "../../contracts/mcp.ts";
import { AuthenticationGate } from "../app.tsx";
import { LocalMcpAuthorizePage } from "../pages/mcp-authorize.tsx";
/** OAuth consent uses the local dashboard identity and retains the original signed query. */
export const Route = createFileRoute("/mcp/authorize")({
  loader: ({ context, location }) => {
    const params = new URLSearchParams(
      location.searchStr.startsWith("?") ? location.searchStr.slice(1) : location.searchStr,
    );
    const id = params.get("client_id") ?? "";
    if (id === "") return undefined;
    return { id, client: context.atoms.prefetch(localMcpClientAtom(id)) };
  },
  component: function Authorize() {
    return (
      <AuthenticationGate loading={<McpConsentLoading />}>
        <LocalMcpAuthorizePage client={Route.useLoaderData()} />
      </AuthenticationGate>
    );
  },
});
