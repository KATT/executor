/** Browser navigation edge for limited connection grants, distinct from dashboard pairing. */
import { Effect, Option, Redacted, Schema } from "effect";
import { AccountConnectionId } from "@executor-js/sdk";
import { ConnectionGrant } from "@executor-js/local-server/account-connections";
import { OAuthCallbackPath } from "@executor-js/local-server/contracts";
import {
  connectionEntryKey,
  decodeConnectionEntry,
  encodeConnectionEntry,
  type ConnectionEntry,
} from "../contracts/account-connections.ts";
import { oauthCallbackUrl } from "./oauth.ts";

const oauthKey = (state: string) => `executor.account-connect.oauth.${state}`;
const decode = Schema.decodeUnknownOption(Schema.fromJsonString(ConnectionGrant));
/** Remove the grant fragment before rendering. Session storage only holds this limited grant, never submitted fields. */
export const readAccountConnection = Effect.sync((): ConnectionEntry | undefined => {
  const url = new URL(window.location.href);
  const match = /^\/account-connect\/([^/]+)$/.exec(url.pathname);
  if (match?.[1]) {
    const connection = Schema.decodeUnknownOption(AccountConnectionId)(match[1]);
    if (Option.isNone(connection)) return undefined;
    const token = new URLSearchParams(url.hash.slice(1)).get("token");
    window.history.replaceState(null, "", url.pathname);
    if (token !== null) {
      const grant = { connection: connection.value, token: Redacted.make(token) };
      sessionStorage.setItem(connectionEntryKey(connection.value), encodeConnectionEntry(grant));
      return grant;
    }
    const saved = sessionStorage.getItem(connectionEntryKey(connection.value));
    return saved === null ? undefined : Option.getOrUndefined(decodeConnectionEntry(saved));
  }
  const state = url.searchParams.get("state");
  if (url.pathname !== OAuthCallbackPath || state === null) return undefined;
  const saved = sessionStorage.getItem(oauthKey(state));
  if (saved === null) return undefined;
  const grant = decode(saved);
  if (Option.isNone(grant)) return undefined;
  sessionStorage.removeItem(oauthKey(state));
  const entry: ConnectionEntry = { ...grant.value, callbackUrl: oauthCallbackUrl(url) };
  sessionStorage.setItem(connectionEntryKey(grant.value.connection), encodeConnectionEntry(entry));
  window.history.replaceState(null, "", `/account-connect/${grant.value.connection}`);
  return entry;
});
/** Match only this OAuth attempt on return, so ordinary dashboard sign-in cannot be intercepted. */
export const openConnectionOAuth = (authorizationUrl: string, grant: ConnectionGrant) =>
  Effect.sync(() => {
    const state = new URL(authorizationUrl).searchParams.get("state");
    if (state === null) throw new Error("OAuth authorization URL is missing state");
    sessionStorage.setItem(
      oauthKey(state),
      Schema.encodeSync(Schema.fromJsonString(ConnectionGrant))(grant),
    );
    window.location.assign(authorizationUrl);
  });
