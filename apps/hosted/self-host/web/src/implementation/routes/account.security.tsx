import { createFileRoute } from "@tanstack/react-router";
import { parseAccountSearch } from "@executor-js/hosted-web/contracts/navigation";
import { SecurityPending } from "@executor-js/hosted-web/account";
import { loadSessions, SecurityPage } from "@executor-js/hosted-web/pages/security";
import { ChangePassword, ChangePasswordPending } from "../components/change-password.tsx";

/** Self-host signs in with a password (or SSO); the password is changed here. */
export const Route = createFileRoute("/account/security")({
  validateSearch: parseAccountSearch,
  loader: ({ context }) => loadSessions(context.atoms),
  pendingComponent: () => (
    <SecurityPending>
      <ChangePasswordPending />
    </SecurityPending>
  ),
  component: SecurityRoute,
});

function SecurityRoute() {
  return (
    <SecurityPage reads={Route.useLoaderData()}>
      <ChangePassword />
    </SecurityPage>
  );
}
