/** Typed browser handoff. Submitted credentials remain redacted in mutation state. */
import { dashboardHttpClient } from "@executor-js/ui/contracts/http";
import { revalidated } from "@executor-js/ui/contracts/refresh";
import {
  AccountConnectApi,
  ConnectionGrant,
  type ConnectionOAuthStart,
  type ConnectionSubmission,
} from "@executor-js/local-server/account-connections";
import { AccountConnectionId, HttpUrl } from "@executor-js/sdk";
import { Data, Effect, Option, Schema } from "effect";
import { Atom, AtomHttpApi } from "effect/reactivity";

/** Only a connection grant authenticates these calls; no dashboard session is needed. */
export class ConnectionClient extends AtomHttpApi.Service<ConnectionClient>()("ConnectionClient", {
  api: AccountConnectApi,
  httpClient: dashboardHttpClient,
}) {}
/** OAuth callback URLs exist in memory only and are removed from the address bar at startup. */
export const ConnectionEntry = Schema.Struct({
  ...ConnectionGrant.fields,
  callbackUrl: Schema.optional(Schema.RedactedFromValue(HttpUrl)),
});
export type ConnectionEntry = typeof ConnectionEntry.Type;
const storedEntry = Schema.fromJsonString(ConnectionEntry);
/** The grant `getRouter` stashed for this connection link, including an OAuth return when there is one. */
export const connectionEntryKey = (connection: string) => `executor.account-connect.${connection}`;
export const encodeConnectionEntry = Schema.encodeSync(storedEntry);
export const decodeConnectionEntry = Schema.decodeUnknownOption(storedEntry);
/** The browser reads the stashed grant. The server never sees it. */
export const readStashedConnection = (
  connection: AccountConnectionId,
): ConnectionEntry | undefined => {
  if (typeof sessionStorage === "undefined") return undefined;
  const saved = sessionStorage.getItem(connectionEntryKey(connection));
  return saved === null ? undefined : Option.getOrUndefined(decodeConnectionEntry(saved));
};
/**
 * A request whose app changed can never complete. Every read and write of it on this page reads
 * it again when it reports the change, so the page drops its old form.
 */
const reloadConnection =
  (connection: AccountConnectionId) => (get: Atom.FnContext | Atom.AtomContext) =>
    Effect.sync(() => get.registry.refresh(connectionDetailsAtom(connection)));
const connectionDetails = Atom.family((connection: AccountConnectionId) => {
  const completion = ConnectionClient.runtime
    .atom(
      Effect.gen(function* () {
        const entry = readStashedConnection(connection);
        if (entry?.callbackUrl === undefined) return undefined;
        const client = yield* ConnectionClient;
        return yield* client.accountConnect
          .completeOAuth({ payload: { ...entry, callbackUrl: entry.callbackUrl } })
          .pipe(Effect.result);
      }),
    )
    .pipe(Atom.keepAlive);
  return ConnectionClient.runtime
    .atom((get) =>
      Effect.gen(function* () {
        const entry = readStashedConnection(connection);
        if (entry === undefined) return undefined;
        const finished = yield* get.result(completion);
        const client = yield* ConnectionClient;
        const request = yield* client.accountConnect.read({ payload: entry });
        return { grant: entry, connection: request, completion: finished };
      }),
    )
    .pipe(Atom.keepAlive);
});
/** Public request metadata for the connection named by the URL. The grant stays in session storage. */
export const connectionDetailsAtom = (connection: AccountConnectionId) =>
  connectionDetails(connection);
/** Idempotent saves return account metadata only. */
export const submitConnectionAtom = ConnectionClient.runtime.fn(
  (payload: typeof ConnectionSubmission.Type, get) =>
    Effect.flatMap(ConnectionClient, (client) => client.accountConnect.submit({ payload })).pipe(
      Effect.tapErrorTag("AccountConnectionTargetChanged", () =>
        reloadConnection(payload.connection)(get),
      ),
    ),
);
/** Cancellation closes the same request observed by the agent. */
export const cancelConnectionAtom = ConnectionClient.mutation("accountConnect", "cancel");
class ConnectionSetupKey extends Data.Class<ConnectionGrant & { readonly method: string }> {}
/**
 * Read again whenever the tab returns, which is when an app changed while the page was open is
 * usually found. The grant exists only in the browser, so the server never renders this read.
 */
const connectionSetup = Atom.family((key: ConnectionSetupKey) =>
  ConnectionClient.runtime
    .atom((get) =>
      Effect.flatMap(ConnectionClient, (client) =>
        client.accountConnect.oauthSetup({ payload: key }),
      ).pipe(
        Effect.tapErrorTag("AccountConnectionTargetChanged", () =>
          reloadConnection(key.connection)(get),
        ),
        // As in the client's own queries, an unreachable server or malformed response is a defect.
        Effect.catchTag(["HttpClientError", "SchemaError"], Effect.die),
      ),
    )
    .pipe(Atom.setIdleTTL("5 minutes"), revalidated),
);
/** Setup metadata is limited to the exact connection grant supplied by this page. */
export const connectionOAuthSetupAtom = (key: ConnectionGrant & { readonly method: string }) =>
  connectionSetup(new ConnectionSetupKey(key));
/** Start provider consent with the host's fixed redirect URI. */
export const startConnectionOAuthAtom = ConnectionClient.runtime.fn(
  (payload: typeof ConnectionOAuthStart.Type, get) =>
    Effect.flatMap(ConnectionClient, (client) =>
      client.accountConnect.startOAuth({ payload }),
    ).pipe(
      Effect.tapErrorTag("AccountConnectionTargetChanged", () =>
        reloadConnection(payload.connection)(get),
      ),
    ),
);
