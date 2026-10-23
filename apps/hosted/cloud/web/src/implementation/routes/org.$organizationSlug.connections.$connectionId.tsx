import { Schema } from "effect";
import { ConnectionSearch } from "@executor-js/hosted-web/contracts/navigation";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { createFileRoute } from "@tanstack/react-router";
import { ConnectionEntry, loadConnection } from "@executor-js/hosted-web/pages/connection-dialog";
import { parseConnectionParams } from "@executor-js/hosted-web/route-params";

export const Route = createFileRoute("/org/$organizationSlug/connections/$connectionId")({
  params: { parse: parseConnectionParams },
  validateSearch: Schema.decodeUnknownSync(ConnectionSearch),
  loader: ({ context, params }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadConnection(context.atoms, organization, params.connectionId),
    ),
  component: () => (
    <ConnectionEntry
      connectionId={Route.useParams().connectionId}
      client={Route.useSearch().client}
      read={Route.useLoaderData()}
    />
  ),
});
