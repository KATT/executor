import { createFileRoute } from "@tanstack/react-router";
import { parseConnectSearch } from "../../contracts/navigation.ts";
import { ConnectAgentPage, loadLocalConnect } from "../pages/connect-agent.tsx";
/** Generated-tree route for /_dashboard/connect. */
export const Route = createFileRoute("/_dashboard/connect")({
  staticData: { section: "connect" },
  validateSearch: parseConnectSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadLocalConnect(context.atoms, deps),
  component: function ConnectRoute() {
    return <ConnectAgentPage reads={Route.useLoaderData()} />;
  },
});
