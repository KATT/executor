import { signInCallback } from "@executor-js/hosted-web/contracts/navigation";
import { BrowserAtoms } from "@executor-js/hosted-web/contracts/telemetry";
import { AuthFailed, authRequest, sessionAtom } from "@executor-js/hosted-web/contracts/auth";
import { createAuthClient } from "better-auth/client";
import { dashboardAuthClientOptions, hydratedResult } from "@executor-js/ui/contracts/http";
import { Effect, Option, Schema } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";
import { SignInSettings } from "./document.ts";
import { invalidate } from "@executor-js/ui/contracts/mutations";

/** Self-host sign-in methods do not expose the shared organization's native client. */
const authClient = createAuthClient({ ...dashboardAuthClientOptions });

/** Settings read when the sign-in document did not include them. */
const liveConfiguration = BrowserAtoms.atom(
  authRequest((options) => authClient.$fetch<unknown>("/self-host/config", options)).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(SignInSettings)),
    Effect.catchTag("SchemaError", () =>
      Effect.fail(
        new AuthFailed({ message: "Unable to load sign-in settings. Reload to try again." }),
      ),
    ),
  ),
);

/** The settings the server read for this sign-in page, sent to the browser with it. */
const entryConfiguration = Atom.make<Option.Option<SignInSettings>>(Option.none()).pipe(
  Atom.serializable({ key: "self-host:sign-in-settings", schema: Schema.Option(SignInSettings) }),
  Atom.keepAlive,
);

/**
 * The server exposes only setup availability and whether the operator enabled SSO. A sign-in
 * document arrives with them, so the server renders the form the visit needs and the browser
 * keeps it; a page the browser opens itself reads them.
 */
export const configurationAtom = Atom.readable(
  (get) => {
    const entry = get(entryConfiguration);
    if (Option.isSome(entry)) return AsyncResult.success<SignInSettings, AuthFailed>(entry.value);
    // The document already gave this read its deadline. Waiting again would hold sign-in for a
    // stall the page has given up on; the browser asks and reports a failure itself.
    if (typeof window === "undefined")
      return AsyncResult.initial<SignInSettings, AuthFailed>(false);
    return get(liveConfiguration);
  },
  (refresh) => {
    refresh(entryConfiguration);
    refresh(liveConfiguration);
  },
).pipe(
  hydratedResult({
    key: "self-host:sign-in-settings-view",
    success: SignInSettings,
    error: AuthFailed,
  }),
);

/** Server rendering starts from the settings it read for this sign-in page. */
export const signInInitialValues = (settings: SignInSettings | null) =>
  settings === null ? [] : [Atom.initialValue(entryConfiguration, Option.some(settings))];

/** Explicit self-host credential flow selected by the user. */
export type SelfHostSignIn =
  | { readonly kind: "login"; readonly email: string; readonly password: string }
  | {
      readonly kind: "setup";
      readonly name: string;
      readonly email: string;
      readonly password: string;
      readonly organizationName: string;
    }
  | {
      readonly kind: "invite";
      readonly name: string;
      readonly email: string;
      readonly password: string;
      readonly invitation: string;
    }
  | { readonly kind: "sso"; readonly redirect: string };

/** Complete one sign-in flow; registration policy stays on the server. */
export const selfHostSignInAtom = BrowserAtoms.fn((input: SelfHostSignIn, get) => {
  const action =
    input.kind === "login"
      ? authRequest((options) => authClient.signIn.email(input, options))
      : input.kind === "sso"
        ? authRequest((options) =>
            authClient.signIn.social(
              {
                provider: "sso",
                callbackURL: signInCallback(input.redirect),
                errorCallbackURL: `/login?redirect=${encodeURIComponent(input.redirect)}`,
              },
              options,
            ),
          )
        : authRequest((options) =>
            authClient.$fetch(input.kind === "setup" ? "/self-host/setup" : "/self-host/register", {
              ...options,
              method: "POST",
              body: input,
            }),
          );
  return action.pipe(
    Effect.withSpan(`ui.auth.${input.kind}`),
    Effect.tap(() =>
      Effect.sync(() => {
        invalidate(get, sessionAtom);
        get.refresh(configurationAtom);
      }),
    ),
    Effect.asVoid,
  );
});
