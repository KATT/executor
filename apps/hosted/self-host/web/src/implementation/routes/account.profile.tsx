import { createFileRoute } from "@tanstack/react-router";
import { parseAccountSearch } from "@executor-js/hosted-web/contracts/navigation";
import { ProfilePending } from "@executor-js/hosted-web/account";
import { ProfilePage, loadProfile } from "@executor-js/hosted-web/pages/profile";

/** The signed-in person's name, email and memberships. */
export const Route = createFileRoute("/account/profile")({
  validateSearch: parseAccountSearch,
  loader: ({ context }) => loadProfile(context.atoms),
  pendingComponent: ProfilePending,
  component: () => <ProfilePage reads={Route.useLoaderData()} />,
});
