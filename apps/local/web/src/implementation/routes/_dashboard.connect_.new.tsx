import { createFileRoute } from "@tanstack/react-router";
import { parseConnectSearch } from "../../contracts/navigation.ts";
import { ConnectAgentPage, loadLocalConnect } from "../pages/connect-agent.tsx";

/** A new scoped connection has its own address, so it can be opened in another tab. */
export const Route = createFileRoute("/_dashboard/connect_/new")({
  staticData: { section: "connect" },
  validateSearch: parseConnectSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadLocalConnect(context.atoms, deps),
  component: function NewScopedConnectionPage() {
    return <ConnectAgentPage screen={{ kind: "new" }} reads={Route.useLoaderData()} />;
  },
});
