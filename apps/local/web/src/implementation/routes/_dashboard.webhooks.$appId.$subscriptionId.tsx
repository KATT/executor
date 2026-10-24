import { createFileRoute } from "@tanstack/react-router";
import { localWebhookSetupAtoms } from "../../contracts/webhook-setup.ts";
import { WebhookSetupPage } from "../pages/webhook-setup.tsx";
import { parseWebhookParams } from "../route-params.ts";
/** Manual setup uses the existing local dashboard authentication gate. */
export const Route = createFileRoute("/_dashboard/webhooks/$appId/$subscriptionId")({
  staticData: { section: "apps" },
  params: { parse: parseWebhookParams },
  loader: ({ context, params }) => ({
    details: context.atoms.prefetchInBrowser(
      localWebhookSetupAtoms(params.appId, params.subscriptionId).details,
    ),
  }),
  component: WebhookRoute,
});

function WebhookRoute() {
  return <WebhookSetupPage {...Route.useParams()} details={Route.useLoaderData().details} />;
}
