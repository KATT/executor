import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { BillingPage, billingSearch, loadBilling } from "../pages/billing.tsx";
import { BillingPagePending } from "../components/page-pending.tsx";

/** Cloud-only page; no matching route exists in Docker. */
export const Route = createFileRoute("/org/$organizationSlug/billing")({
  validateSearch: billingSearch,
  loaderDeps: ({ search }) => ({ organization: search.organization, plan: search.plan }),
  loader: ({ context, params, deps }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadBilling(context.atoms, organization, deps),
    ),
  pendingComponent: BillingPagePending,
  component: Page,
});

function Page() {
  const navigate = Route.useNavigate();
  const onCheckoutSettled = useCallback(() => {
    void navigate({
      search: ({ organization: _organization, plan: _plan, ...rest }) => rest,
      hash: true,
      replace: true,
    });
  }, [navigate]);
  return (
    <BillingPage
      returned={Route.useSearch()}
      reads={Route.useLoaderData()}
      onCheckoutSettled={onCheckoutSettled}
    />
  );
}
