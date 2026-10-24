import { createFileRoute } from "@tanstack/react-router";
import { parseAccountSearch } from "@executor-js/hosted-web/contracts/navigation";
import { TokensPending } from "@executor-js/hosted-web/account";
import { loadTokens, TokensPage } from "@executor-js/hosted-web/pages/tokens";

/** The signed-in user's personal access tokens across every organization. */
export const Route = createFileRoute("/account/tokens")({
  validateSearch: parseAccountSearch,
  loaderDeps: ({ search }) => ({ offset: search.offset ?? 0 }),
  loader: ({ context, deps }) => loadTokens(context.atoms, deps.offset),
  // The heading and guidance are the page. Show them on the first frame of a client navigation,
  // while the token list is still held, instead of keeping the previous page for the default delay.
  pendingMs: 0,
  pendingComponent: TokensPending,
  component: TokensRoute,
});

function TokensRoute() {
  const { organization, offset } = Route.useSearch();
  return (
    <TokensPage organization={organization} offset={offset ?? 0} reads={Route.useLoaderData()} />
  );
}
