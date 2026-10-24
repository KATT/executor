import { createFileRoute } from "@tanstack/react-router";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { parseAccountsSetupSearch } from "@executor-js/hosted-web/contracts/navigation";
import { AccountsSetupPage, loadAccountsSetup } from "@executor-js/hosted-web/pages/accounts-setup";

/** Connect accounts for the new team's apps; its URL carries the assistant if it came first. */
export const Route = createFileRoute("/org/$organizationSlug_/setup/accounts")({
  codeSplitGroupings: [],
  validateSearch: parseAccountsSetupSearch,
  loader: ({ context, params }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadAccountsSetup(context.atoms, organization),
    ),
  component: () => <AccountsSetupPage reads={Route.useLoaderData()} />,
});
