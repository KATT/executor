import { createFileRoute } from "@tanstack/react-router";
import { ConnectPage } from "@executor-js/hosted-web/pages/connect";
import { parseMcpConnectionParams } from "@executor-js/hosted-web/route-params";

/** Edit one scoped connection without leaving its address out of the URL. */
export const Route = createFileRoute("/org/$organizationSlug/connect_/$connectionId_/edit")({
  params: { parse: parseMcpConnectionParams },
  component: function EditScopedConnectionPage() {
    const { connectionId } = Route.useParams();
    return <ConnectPage screen={{ kind: "edit", connection: connectionId }} />;
  },
});
