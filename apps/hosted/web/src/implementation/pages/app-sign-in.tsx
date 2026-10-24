import { useAtomRefresh } from "@effect/atom-react";
import type { App } from "@executor-js/sdk";
import { Button } from "@executor-js/ui/components/button";
import { AsyncResult } from "effect/reactivity";
import { Suspense, useEffect } from "react";
import { useAtomResult, type Handle } from "raf-effect-atom";
import {
  appSignInFailureMessage,
  appUiError,
  appUiLocationAtom,
  type AppSignInFailure,
  type AppSignInId,
} from "../../contracts/app-ui.ts";
import { useOrganizationRoute } from "../components/organization.tsx";

/**
 * The server answers `/app-auth` with a redirect whenever it has an attempt to resolve, so this page
 * renders only for a failure, a missing attempt, or a client-side navigation that must reach it.
 */
export function AppSignInPage({
  request,
  failure,
}: {
  readonly request: AppSignInId | undefined;
  readonly failure: AppSignInFailure | undefined;
}) {
  const pending = failure === undefined && request !== undefined;
  useEffect(() => {
    if (pending) window.location.replace(window.location.href);
  }, [pending]);
  return (
    <div className="auth-pending min-h-dvh flex items-center justify-center gap-4">
      <h1 className="text-[22px] font-semibold tracking-[-0.035em] leading-[1.35] [&>span]:text-muted-foreground [&>span]:text-[13px] [&>span]:font-mono [&>span]:font-normal [&>span]:ml-[8px] [&>span]:align-middle">
        {pending ? "Opening app…" : "Could not open app"}
      </h1>
      {failure !== undefined && <p role="alert">{appSignInFailureMessage(failure)}</p>}
      {failure === undefined && request === undefined && <p>Open the app URL to sign in.</p>}
    </div>
  );
}

/**
 * Optional action slot: products with app hosting render a normal link. The app runs with the
 * accounts the caller linked to it.
 */
export function OpenAppAction({
  app,
  location,
}: {
  readonly app: App;
  readonly location: Handle<ReturnType<typeof appUiLocationAtom>> | undefined;
}) {
  return app.activeVersion === null || location === undefined ? null : (
    <Suspense fallback={null}>
      <DeployedOpenAppAction app={app} version={app.activeVersion} location={location} />
    </Suspense>
  );
}

function DeployedOpenAppAction({
  app,
  version,
  location,
}: {
  readonly app: App;
  readonly version: NonNullable<App["activeVersion"]>;
  readonly location: Handle<ReturnType<typeof appUiLocationAtom>>;
}) {
  const { organization, slug } = useOrganizationRoute();
  const source = appUiLocationAtom({
    organization,
    slug,
    app: app.id,
    appSlug: app.slug,
    version,
  });
  const result = useAtomResult(source, location);
  const refresh = useAtomRefresh(source);
  if (AsyncResult.isFailure(result))
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-sm text-sm text-muted-foreground" role="status">
          {appUiError(result.cause)}
        </span>
        <Button variant="outline" onClick={refresh}>
          Check again
        </Button>
      </div>
    );
  if (!AsyncResult.isSuccess(result)) return null;
  if (result.value.status === "pending")
    return (
      <span className="text-sm text-muted-foreground" role="status">
        Preparing app domain…
      </span>
    );
  if (result.value.status === "failed")
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground" role="status">
          App domain setup needs attention.
        </span>
        <Button variant="outline" onClick={refresh}>
          Check again
        </Button>
      </div>
    );
  if (result.value.status !== "ready") return null;
  return (
    <Button variant="outline" asChild>
      <a href={result.value.url} target="_blank" rel="noopener noreferrer">
        Open app
      </a>
    </Button>
  );
}
