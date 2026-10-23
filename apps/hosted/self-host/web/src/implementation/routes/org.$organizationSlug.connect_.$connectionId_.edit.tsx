import { createFileRoute } from "@tanstack/react-router";
import {
  ConnectPage,
  connectOrganizationReads,
  loadConnect,
} from "@executor-js/hosted-web/pages/connect";
import { parseMcpConnectionParams } from "@executor-js/hosted-web/route-params";

/** Edit one scoped connection without leaving its address out of the URL. */
export const Route = createFileRoute("/org/$organizationSlug/connect_/$connectionId_/edit")({
  params: { parse: parseMcpConnectionParams },
  staticData: { organizationReads: connectOrganizationReads },
  loader: ({ context, params }) =>
    loadConnect({ atoms: context.atoms, organizationSlug: params.organizationSlug }),
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
