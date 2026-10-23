import { createFileRoute } from "@tanstack/react-router";
import { ConnectAgentPage, loadLocalConnect } from "../pages/connect-agent.tsx";
/** Generated-tree route for /_dashboard/connect. */
export const Route = createFileRoute("/_dashboard/connect")({
  staticData: { section: "connect" },
  loader: ({ context }) => loadLocalConnect(context.atoms),
  component: function ConnectRoute() {
    return <ConnectAgentPage reads={Route.useLoaderData()} />;
  },
});
