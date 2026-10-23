import { createFileRoute } from "@tanstack/react-router";
import {
  ConnectPage,
  connectOrganizationReads,
  loadConnect,
} from "@executor-js/hosted-web/pages/connect";

/** A new scoped connection has its own address, so it can be opened in another tab. */
export const Route = createFileRoute("/org/$organizationSlug/connect_/new")({
  staticData: { organizationReads: connectOrganizationReads },
  loader: ({ context, params }) =>
    loadConnect({ atoms: context.atoms, organizationSlug: params.organizationSlug }),
  component: function NewScopedConnectionPage() {
    return <ConnectPage screen={{ kind: "new" }} reads={Route.useLoaderData()} />;
  },
});
