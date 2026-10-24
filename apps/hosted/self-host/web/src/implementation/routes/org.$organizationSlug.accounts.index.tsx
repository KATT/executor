import { parseAccountsSearch } from "@executor-js/hosted-web/contracts/navigation";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { createFileRoute } from "@tanstack/react-router";
import { AccountsPage, loadAccounts } from "@executor-js/hosted-web/pages/accounts";

/** Hosted account inventory. */
export const Route = createFileRoute("/org/$organizationSlug/accounts/")({
  validateSearch: parseAccountsSearch,
  loader: ({ context, params }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadAccounts(context.atoms, organization),
    ),
  component: Page,
});

function Page() {
  const { account, manage } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <AccountsPage
      highlight={account}
      oauthClients={{
        open: manage === "oauth-clients",
        onOpenChange: (open) => {
          void navigate({
            search: (current) => ({ ...current, manage: open ? "oauth-clients" : undefined }),
            replace: true,
          });
        },
      }}
      reads={Route.useLoaderData()}
    />
  );
}
