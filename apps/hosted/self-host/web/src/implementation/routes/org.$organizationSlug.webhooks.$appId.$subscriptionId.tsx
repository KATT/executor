import { createFileRoute } from "@tanstack/react-router";
import { loadHostedWebhook, WebhookSetupPage } from "@executor-js/hosted-web/pages/webhook-setup";
import { parseWebhookParams } from "@executor-js/hosted-web/route-params";
/** The organization and subscription identity are explicit in the URL. */
export const Route = createFileRoute("/org/$organizationSlug/webhooks/$appId/$subscriptionId")({
  params: { parse: parseWebhookParams },
  loader: ({ context, params }) =>
    loadHostedWebhook(context.atoms, params.organizationSlug, params.appId, params.subscriptionId),
  component: WebhookRoute,
});

function WebhookRoute() {
  const { appId, subscriptionId } = Route.useParams();
  return (
    <WebhookSetupPage
      appId={appId}
      subscriptionId={subscriptionId}
      details={Route.useLoaderData().details}
    />
  );
}
