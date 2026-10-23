import { createFileRoute } from "@tanstack/react-router";
import { ConnectPage, loadConnect } from "@executor-js/hosted-web/pages/connect";
import { parseConnectSearch } from "@executor-js/hosted-web/contracts/navigation";

export const Route = createFileRoute("/org/$organizationSlug/connect")({
  validateSearch: parseConnectSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    loadConnect({
      atoms: context.atoms,
      organizationSlug: params.organizationSlug,
      search: deps,
    }),
  component: function ConnectRoute() {
    return <ConnectPage reads={Route.useLoaderData()} />;
  },
});
