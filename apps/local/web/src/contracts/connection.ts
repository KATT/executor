import { dashboardHttpClient, hydrated } from "@executor-js/ui/contracts/http";
import { revalidated } from "@executor-js/ui/contracts/refresh";
import { DashboardRuntime } from "./telemetry.ts";
/** Local auth state uses the same HTTP contracts as the server. A pairing token is stashed only until this document exchanges it. */
import { BootstrapToken, LocalAuthApi } from "@executor-js/local-server/auth";
import { Effect, Option, Redacted, Schema } from "effect";
import { HttpClient } from "effect/http";
import { Atom, AtomHttpApi } from "effect/reactivity";

/** Browser cookie authentication is automatic on same-origin requests. */
export class AuthClient extends AtomHttpApi.Service<AuthClient>()("AuthClient", {
  api: LocalAuthApi,
  runtime: DashboardRuntime,
  transformClient: (client) =>
    client.pipe(HttpClient.transformResponse(Effect.withSpan("ui.auth"))),
  httpClient: dashboardHttpClient,
}) {}

/** The pairing token `getRouter` erased from the address fragment, until this document exchanges it. */
export const pairingTokenKey = "executor.local.pair";
export const stashPairingToken = (token: typeof BootstrapToken.Type) => {
  sessionStorage.setItem(pairingTokenKey, Redacted.value(token));
};
const stashedPairingToken = () => {
  if (typeof sessionStorage === "undefined") return undefined;
  const saved = sessionStorage.getItem(pairingTokenKey);
  return saved === null
    ? undefined
    : Option.getOrUndefined(Schema.decodeUnknownOption(BootstrapToken)(saved));
};
/** Session checks expose only authenticated status, never the HttpOnly credential. */
export const sessionAtom = AuthClient.query("auth", "session", hydrated({})).pipe(revalidated);
/** Exchange the stashed pairing link before mounting authenticated reads. */
export const bootstrapAtom = AuthClient.runtime
  .atom((get) =>
    Effect.gen(function* () {
      const token = stashedPairingToken();
      if (token !== undefined) {
        const client = yield* AuthClient;
        yield* client.auth.exchange({ payload: { token } });
        sessionStorage.removeItem(pairingTokenKey);
        get.refresh(sessionAtom);
      }
    }),
  )
  .pipe(Atom.keepAlive);
