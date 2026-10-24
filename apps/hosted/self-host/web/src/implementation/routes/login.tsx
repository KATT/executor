import { SelfHostLoginPage } from "../pages/login.tsx";
import { SelfHostLoginPending } from "../components/login-pending.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { loginProps, loginSearch } from "@executor-js/hosted-web/pages/login";
import { configurationAtom } from "../../contracts/auth.ts";

/** Each host mounts the same login UI on its own origin. */
export const Route = createFileRoute("/login")({
  validateSearch: loginSearch,
  loader: ({ context }) => ({
    config: context.atoms.prefetch(configurationAtom),
  }),
  component: () => (
    <SelfHostLoginPage {...loginProps(Route.useSearch())} config={Route.useLoaderData().config} />
  ),
  // Where the browser opens sign-in itself, nothing is drawn that the form could move.
  pendingComponent: SelfHostLoginPending,
});
