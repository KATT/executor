import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import { OrganizationReference } from "@executor-js/hosted-server/organization";
import { WebhookSetupFrame, WebhookSetupLoading } from "@executor-js/ui/dashboard/loading";
import { WebhookSetupPage as SharedPage } from "@executor-js/ui/dashboard/webhook-setup";
import type { AppId, WebhookId } from "@executor-js/sdk";
import { Schema } from "effect";
import { Suspense } from "react";
import { Loader, useAtomResult, type Handle } from "raf-effect-atom";
import { hostedWebhookSetupAtoms } from "../../contracts/webhook-setup.ts";
import { HostedFailure } from "../components/dashboard-bindings.tsx";
import { useOrganizationRoute } from "../components/organization.tsx";

type WebhookDetails = ReturnType<typeof hostedWebhookSetupAtoms>["details"];

/** The signing secret stays in the browser. Both hosts call this from the subscription route. */
export function loadHostedWebhook(
  atoms: Loader.Loader,
  organizationSlug: string,
  appId: AppId,
  subscriptionId: WebhookId,
) {
  return {
    details: atoms.prefetchInBrowser(
      hostedWebhookSetupAtoms(
        Schema.decodeUnknownSync(OrganizationReference)(organizationSlug),
        appId,
        subscriptionId,
      ).details,
    ),
  };
}

/** Cloud and self-host render the same page through their own TanStack route trees. */
export function WebhookSetupPage({
  appId,
  subscriptionId,
  details,
}: {
  readonly appId: AppId;
  readonly subscriptionId: WebhookId;
  readonly details: Handle<WebhookDetails>;
}) {
  const { slug } = useOrganizationRoute();
  const atoms = hostedWebhookSetupAtoms(
    Schema.decodeUnknownSync(OrganizationReference)(slug),
    appId,
    subscriptionId,
  );
  return (
    <Suspense
      fallback={
        <WebhookSetupFrame>
          <WebhookSetupLoading />
        </WebhookSetupFrame>
      }
    >
      <WebhookSetupRead atoms={atoms} details={details} />
    </Suspense>
  );
}

function WebhookSetupRead({
  atoms,
  details,
}: {
  readonly atoms: ReturnType<typeof hostedWebhookSetupAtoms>;
  readonly details: Handle<WebhookDetails>;
}) {
  const complete = useAtomSet(atoms.complete, { mode: "promiseExit" });
  const remove = useAtomSet(atoms.remove, { mode: "promiseExit" });
  const confirmRemoval = useAtomSet(atoms.confirmRemoval, { mode: "promiseExit" });
  return (
    <SharedPage
      result={useAtomResult(atoms.details, details)}
      complete={complete}
      remove={() => remove()}
      confirmRemoval={() => confirmRemoval()}
      retry={useAtomRefresh(atoms.details)}
      Failure={HostedFailure}
    />
  );
}
