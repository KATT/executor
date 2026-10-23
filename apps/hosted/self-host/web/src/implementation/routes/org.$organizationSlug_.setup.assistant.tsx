import { createFileRoute } from "@tanstack/react-router";
import { prefetchAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { parseAgentSetupSearch } from "@executor-js/hosted-web/contracts/navigation";
import { inventoryAtom } from "@executor-js/hosted-web/contracts/organization";
import { AgentSetupPage } from "@executor-js/hosted-web/pages/agent-setup";

/** The assistant handoff, available on reload; its first prompt names the connected accounts. */
export const Route = createFileRoute("/org/$organizationSlug_/setup/assistant")({
  codeSplitGroupings: [],
  validateSearch: parseAgentSetupSearch,
  loader: ({ context, params }) =>
    prefetchAfterAccess(context.atoms, params.organizationSlug, (organization) => [
      inventoryAtom(organization),
    ]),
  component: AgentSetupPage,
});
