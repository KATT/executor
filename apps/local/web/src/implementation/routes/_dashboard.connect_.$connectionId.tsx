import { createFileRoute } from "@tanstack/react-router";
import { ConnectAgentPage } from "../pages/connect-agent.tsx";
import { parseMcpConnectionParams } from "../route-params.ts";

/** One scoped connection. The id is an MCP connection, not an account handoff. */
export const Route = createFileRoute("/_dashboard/connect_/$connectionId")({
  staticData: { section: "connect" },
  params: { parse: parseMcpConnectionParams },
  component: function ScopedConnectionPage() {
    const { connectionId } = Route.useParams();
    return <ConnectAgentPage screen={{ kind: "detail", connection: connectionId }} />;
  },
});
