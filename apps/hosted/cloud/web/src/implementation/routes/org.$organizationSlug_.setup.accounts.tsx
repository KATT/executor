import { createFileRoute } from "@tanstack/react-router";
import { prefetchAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { parseAccountsSetupSearch } from "@executor-js/hosted-web/contracts/navigation";
import { inventoryAtom } from "@executor-js/hosted-web/contracts/organization";
import { AccountsSetupPage } from "@executor-js/hosted-web/pages/accounts-setup";

/** Connect accounts for the new team's apps; its URL carries the assistant if it came first. */
export const Route = createFileRoute("/org/$organizationSlug_/setup/accounts")({
  codeSplitGroupings: [],
  validateSearch: parseAccountsSetupSearch,
  loader: ({ context, params }) =>
    prefetchAfterAccess(context.atoms, params.organizationSlug, (organization) => [
      inventoryAtom(organization),
    ]),
  component: AccountsSetupPage,
});
