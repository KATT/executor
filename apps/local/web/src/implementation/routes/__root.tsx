import { ExecutorDevtools } from "@executor-js/devtools";
import { ClientOnly, createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { Loader } from "raf-effect-atom";
import { bootstrapAtom } from "../../contracts/connection.ts";
import { localPageTitle } from "../../contracts/navigation.ts";
import { NotFoundPage, PageError } from "../components/not-found.tsx";
import { useLocation } from "@tanstack/react-router";
import { DocumentTitleProvider, productTitle } from "@executor-js/ui/hooks/document-title";
import { DashboardDocument } from "@executor-js/dashboard-start/shell";
import styles from "../styles/globals.css?url";
import { fontPreloads } from "@executor-js/ui/lib/fonts";

/** Standalone connection handoffs and authenticated dashboard routes share only the router. */
export const Route = createRootRouteWithContext<{
  readonly atoms: Loader.Loader;
}>()({
  loader: ({ context }) => ({
    bootstrap: context.atoms.prefetchInBrowser(bootstrapAtom),
  }),
  head: () => ({
    links: [...fontPreloads, { rel: "stylesheet", href: styles }],
    meta: [{ title: "Executor · Local" }],
  }),
  shellComponent: DashboardDocument,
  component: Root,
  notFoundComponent: NotFoundPage,
  errorComponent: PageError,
});

function Root() {
  const { pathname } = useLocation();
  return (
    <DocumentTitleProvider fallbackTitle={productTitle(localPageTitle(pathname))}>
      <Outlet />
      {/* A development overlay; it reads the browser origin and has no server markup. */}
      <ClientOnly>
        <ExecutorDevtools />
      </ClientOnly>
    </DocumentTitleProvider>
  );
}
