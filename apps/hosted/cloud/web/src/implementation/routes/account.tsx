import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ErrorTrackingProvider } from "@executor-js/ui/dashboard/error-tracking";
import { AccountPending, AccountShell } from "@executor-js/hosted-web/account";
import { CloudSupport } from "../components/support.tsx";
import { PasskeysPending } from "../components/passkeys.tsx";

/** Personal settings sit outside every organization; the switcher gives way to a way back. */
export const Route = createFileRoute("/account")({
  component: AccountLayout,
  // This bundle is the first match still loading. Its pending view names the page in the
  // address, so the token heading has to paint on the first frame of a client navigation.
  pendingMs: 0,
  pendingComponent: () => (
    <AccountPending support={<CloudSupport />} security={<PasskeysPending />} />
  ),
});

function AccountLayout() {
  return (
    <ErrorTrackingProvider>
      <AccountShell support={<CloudSupport />}>
        <Outlet />
      </AccountShell>
    </ErrorTrackingProvider>
  );
}
