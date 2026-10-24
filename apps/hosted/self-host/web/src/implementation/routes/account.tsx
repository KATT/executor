import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AccountPending, AccountShell } from "@executor-js/hosted-web/account";
import { ChangePasswordPending } from "../components/change-password.tsx";

/** Personal settings sit outside every organization; the switcher gives way to a way back. */
export const Route = createFileRoute("/account")({
  component: () => (
    <AccountShell>
      <Outlet />
    </AccountShell>
  ),
  // This bundle is the first match still loading. Its pending view names the page in the
  // address, so the token heading has to paint on the first frame of a client navigation.
  pendingMs: 0,
  pendingComponent: () => <AccountPending security={<ChangePasswordPending />} />,
});
