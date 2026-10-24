import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import { WebhookSetupFrame, WebhookSetupLoading } from "@executor-js/ui/dashboard/loading";
import { WebhookSetupPage as SharedPage } from "@executor-js/ui/dashboard/webhook-setup";
import type { AppId, WebhookId } from "@executor-js/sdk";
import { Suspense } from "react";
import { useAtomResult, type Handle } from "raf-effect-atom";
import { localWebhookSetupAtoms } from "../../contracts/webhook-setup.ts";
import { Failure } from "../components/common.tsx";

type WebhookDetails = ReturnType<typeof localWebhookSetupAtoms>["details"];

/** The existing dashboard gate pairs the browser before these private atoms mount. */
export function WebhookSetupPage({
  appId,
  subscriptionId,
  details,
}: {
  readonly appId: AppId;
  readonly subscriptionId: WebhookId;
  readonly details: Handle<WebhookDetails>;
}) {
  const atoms = localWebhookSetupAtoms(appId, subscriptionId);
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
  readonly atoms: ReturnType<typeof localWebhookSetupAtoms>;
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
      Failure={Failure}
    />
  );
}
