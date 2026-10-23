import { createFileRoute } from "@tanstack/react-router";
import { completeOAuthAtom } from "../../contracts/oauth.ts";
import { OAuthCallbackPage } from "../pages/oauth.tsx";
import { Empty } from "../components/common.tsx";
/** The callback credential is erased before this loader. The browser completes the sign-in. */
export const Route = createFileRoute("/_dashboard/_inventory/api/oauth/callback")({
  ssr: false,
  loader: ({ context }) => ({
    completion: context.atoms.prefetchInBrowser(completeOAuthAtom),
  }),
  pendingComponent: () => (
    <Empty title="Connecting your account">Completing provider sign-in…</Empty>
  ),
  component: function OAuthCallback() {
    const { completion } = Route.useLoaderData();
    return <OAuthCallbackPage completion={completion} />;
  },
});
