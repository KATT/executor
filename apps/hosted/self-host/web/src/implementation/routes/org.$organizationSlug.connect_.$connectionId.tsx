import { createFileRoute } from "@tanstack/react-router";
import { ConnectPage } from "@executor-js/hosted-web/pages/connect";
import { parseMcpConnectionParams } from "@executor-js/hosted-web/route-params";

/** One scoped connection. The id is an MCP connection, not an account handoff. */
export const Route = createFileRoute("/org/$organizationSlug/connect_/$connectionId")({
  params: { parse: parseMcpConnectionParams },
  component: function ScopedConnectionPage() {
    const { connectionId } = Route.useParams();
    return <ConnectPage screen={{ kind: "detail", connection: connectionId }} />;
  },
});
