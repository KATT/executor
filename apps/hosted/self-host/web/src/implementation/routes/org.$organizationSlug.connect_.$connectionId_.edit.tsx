import { createFileRoute } from "@tanstack/react-router";
import { ConnectPage, loadConnect } from "@executor-js/hosted-web/pages/connect";
import { parseConnectSearch } from "@executor-js/hosted-web/contracts/navigation";
import { parseMcpConnectionParams } from "@executor-js/hosted-web/route-params";

/** Edit one scoped connection without leaving its address out of the URL. */
export const Route = createFileRoute("/org/$organizationSlug/connect_/$connectionId_/edit")({
  params: { parse: parseMcpConnectionParams },
  validateSearch: parseConnectSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    loadConnect({
      atoms: context.atoms,
      organizationSlug: params.organizationSlug,
      search: deps,
    }),
  component: function EditScopedConnectionPage() {
    const { connectionId } = Route.useParams();
    return (
      <ConnectPage
        screen={{ kind: "edit", connection: connectionId }}
        reads={Route.useLoaderData()}
      />
    );
  },
});
