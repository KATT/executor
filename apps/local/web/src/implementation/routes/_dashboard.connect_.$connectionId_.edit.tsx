import { createFileRoute } from "@tanstack/react-router";
import { ConnectAgentPage, loadLocalConnect } from "../pages/connect-agent.tsx";
import { parseMcpConnectionParams } from "../route-params.ts";

/** Edit one scoped connection without leaving its address out of the URL. */
export const Route = createFileRoute("/_dashboard/connect_/$connectionId_/edit")({
  staticData: { section: "connect" },
  params: { parse: parseMcpConnectionParams },
  loader: ({ context }) => loadLocalConnect(context.atoms),
  component: function EditScopedConnectionPage() {
    const { connectionId } = Route.useParams();
    return (
      <ConnectAgentPage
        screen={{ kind: "edit", connection: connectionId }}
        reads={Route.useLoaderData()}
      />
    );
  },
});
