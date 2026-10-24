import { createFileRoute } from "@tanstack/react-router";
import { ConnectPage, loadConnect } from "@executor-js/hosted-web/pages/connect";
import { parseConnectSearch } from "@executor-js/hosted-web/contracts/navigation";
import { parseMcpConnectionParams } from "@executor-js/hosted-web/route-params";

/** One scoped connection. The id is an MCP connection, not an account handoff. */
export const Route = createFileRoute("/org/$organizationSlug/connect_/$connectionId")({
  params: { parse: parseMcpConnectionParams },
  validateSearch: parseConnectSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    loadConnect({
      atoms: context.atoms,
      organizationSlug: params.organizationSlug,
      search: deps,
    }),
  component: function ScopedConnectionPage() {
    const { connectionId } = Route.useParams();
    return (
      <ConnectPage
        screen={{ kind: "detail", connection: connectionId }}
        reads={Route.useLoaderData()}
      />
    );
  },
});
