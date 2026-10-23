import { createFileRoute } from "@tanstack/react-router";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { parseAgentSetupSearch } from "@executor-js/hosted-web/contracts/navigation";
import { AgentSetupPage, loadAgentSetup } from "@executor-js/hosted-web/pages/agent-setup";

/** The assistant handoff, available on reload; its first prompt names the connected accounts. */
export const Route = createFileRoute("/org/$organizationSlug_/setup/assistant")({
  codeSplitGroupings: [],
  validateSearch: parseAgentSetupSearch,
  loader: ({ context, params }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadAgentSetup(context.atoms, organization),
    ),
  component: function AssistantSetup() {
    const reads = Route.useLoaderData();
    return reads === undefined ? null : <AgentSetupPage inventory={reads.inventory} />;
  },
});
