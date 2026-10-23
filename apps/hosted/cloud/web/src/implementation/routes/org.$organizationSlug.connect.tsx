import { createFileRoute } from "@tanstack/react-router";
import {
  ConnectPage,
  connectOrganizationReads,
  loadConnect,
} from "@executor-js/hosted-web/pages/connect";

export const Route = createFileRoute("/org/$organizationSlug/connect")({
  staticData: { organizationReads: connectOrganizationReads },
  loader: ({ context, params }) =>
    loadConnect({ atoms: context.atoms, organizationSlug: params.organizationSlug }),
  component: function ConnectRoute() {
    return <ConnectPage reads={Route.useLoaderData()} />;
  },
});
