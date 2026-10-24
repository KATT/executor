import { createFileRoute } from "@tanstack/react-router";
import { parseAccountSearch } from "@executor-js/hosted-web/contracts/navigation";
import { SecurityPending } from "@executor-js/hosted-web/account";
import { loadSessions, SecurityPage } from "@executor-js/hosted-web/pages/security";
import { passkeysAtom } from "../../contracts/auth.ts";
import { Passkeys, PasskeysPending } from "../components/passkeys.tsx";

/** Cloud signs in with passkeys, email codes and social accounts; passkeys are managed here. */
export const Route = createFileRoute("/account/security")({
  validateSearch: parseAccountSearch,
  loader: ({ context }) => ({
    ...loadSessions(context.atoms),
    passkeys: context.atoms.prefetch(passkeysAtom),
  }),
  pendingComponent: () => (
    <SecurityPending>
      <PasskeysPending />
    </SecurityPending>
  ),
  component: SecurityRoute,
});

function SecurityRoute() {
  const reads = Route.useLoaderData();
  return (
    <SecurityPage reads={reads}>
      <Passkeys passkeys={reads.passkeys} />
    </SecurityPage>
  );
}
