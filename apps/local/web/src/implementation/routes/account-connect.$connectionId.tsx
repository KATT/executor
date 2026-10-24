import { createFileRoute } from "@tanstack/react-router";
import { Option, Schema } from "effect";
import { AccountConnectionId } from "@executor-js/sdk";
import { connectionDetailsAtom } from "../../contracts/account-connections.ts";
import { ConnectAccountPage, ConnectAccountUnavailable } from "../pages/connect-account.tsx";
/** The connection id is in the URL. The grant stays in the browser, so the read starts there. */
export const Route = createFileRoute("/account-connect/$connectionId")({
  loader: ({ context, params }) => {
    const connection = Schema.decodeUnknownOption(AccountConnectionId)(params.connectionId);
    if (Option.isNone(connection)) return undefined;
    return {
      connection: connection.value,
      details: context.atoms.prefetchInBrowser(connectionDetailsAtom(connection.value)),
    };
  },
  component: function AccountConnect() {
    const reads = Route.useLoaderData();
    return reads === undefined ? (
      <ConnectAccountUnavailable />
    ) : (
      <ConnectAccountPage connection={reads.connection} details={reads.details} />
    );
  },
});
