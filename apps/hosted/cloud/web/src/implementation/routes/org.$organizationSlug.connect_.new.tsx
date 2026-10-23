import { createFileRoute } from "@tanstack/react-router";
import { ConnectPage, loadConnect } from "@executor-js/hosted-web/pages/connect";
import { parseConnectSearch } from "@executor-js/hosted-web/contracts/navigation";

/** A new scoped connection has its own address, so it can be opened in another tab. */
export const Route = createFileRoute("/org/$organizationSlug/connect_/new")({
  validateSearch: parseConnectSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    loadConnect({
      atoms: context.atoms,
      organizationSlug: params.organizationSlug,
      search: deps,
    }),
  component: function NewScopedConnectionPage() {
    return <ConnectPage screen={{ kind: "new" }} reads={Route.useLoaderData()} />;
  },
});
