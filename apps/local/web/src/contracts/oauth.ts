/** Typed browser OAuth operations. Client secrets and callback URLs stay redacted in Atom state. */
import { hydrated } from "@executor-js/ui/contracts/http";
import { revalidated } from "@executor-js/ui/contracts/refresh";
import { Data, Effect, Option, Redacted, Schema } from "effect";
import { Atom } from "effect/reactivity";
import { AppId, type ProviderId } from "@executor-js/sdk";
import { DashboardClient, appAtom, toolsAtom } from "./api.ts";
import { refreshAppLinks } from "./app-accounts.ts";
import { accountCredentialsChanged } from "./accounts.ts";
import { invalidate } from "@executor-js/ui/contracts/mutations";

class OAuthSetupKey extends Data.Class<{
  readonly provider: ProviderId;
  readonly method: string;
}> {}
const setupQuery = Atom.family((key: OAuthSetupKey) =>
  DashboardClient.query("dashboard", "oauthSetup", hydrated({ payload: key })).pipe(
    Atom.setIdleTTL("5 minutes"),
    revalidated,
  ),
);
/** Share read-only client requirements across local forms without creating connection attempts. */
export const oauthSetupAtom = (key: { readonly provider: ProviderId; readonly method: string }) =>
  setupQuery(new OAuthSetupKey(key));

/** The callback URL `getRouter` erased from the address, until this document finishes it. */
export const oauthCallbackKey = "executor.oauth.callback";
export const stashOAuthCallback = (callback: Redacted.Redacted<string>) => {
  sessionStorage.setItem(oauthCallbackKey, Redacted.value(callback));
};
const stashedOAuthCallback = () => {
  if (typeof sessionStorage === "undefined") return undefined;
  const saved = sessionStorage.getItem(oauthCallbackKey);
  return saved === null ? undefined : Redacted.make(saved);
};
/** Safe navigation intent; the server finds the connection from the callback's OAuth state. */
/**
 * Every sign-in fills an app requirement, so it returns to that app's accounts, where the new
 * account is already linked. A reconnect keeps the account's name.
 */
export const OAuthReturn = Schema.Struct({
  app: AppId,
  reconnect: Schema.Boolean,
});
/** Finish once per document load, even if React remounts the page. */
export const completeOAuthAtom = DashboardClient.runtime
  .atom((get) =>
    Effect.gen(function* () {
      const callbackUrl = stashedOAuthCallback();
      if (callbackUrl === undefined) return undefined;
      const client = yield* DashboardClient;
      // A provider link opened in another tab has no saved return; it still completes.
      const target = Schema.decodeUnknownOption(Schema.fromJsonString(OAuthReturn))(
        sessionStorage.getItem("executor.oauth.return"),
      );
      const savedAccount = yield* client.dashboard.completeOAuth({ payload: { callbackUrl } });
      sessionStorage.removeItem(oauthCallbackKey);
      accountCredentialsChanged(get, savedAccount);
      if (Option.isSome(target)) {
        invalidate(get, appAtom(target.value.app));
        get.refresh(toolsAtom({ app: target.value.app }));
        refreshAppLinks(get, target.value.app);
      }
      return savedAccount;
    }),
  )
  .pipe(Atom.keepAlive);
