import { documentValues } from "@executor-js/dashboard-start/api";
import { dashboardRegistry } from "@executor-js/dashboard-start/registry";
import { Effect } from "effect";
import { createRouter, stringifySearchWith } from "@tanstack/react-router";
import { parseSearchParams, type NavigationSection } from "../contracts/navigation.ts";
import { readAccountConnection } from "./account-connections.ts";
import { readPairingToken } from "./connection.ts";
import { readOAuthCallback } from "./oauth.ts";
import { PageError } from "./components/not-found.tsx";
import { routeTree } from "./routeTree.gen.ts";
import { serverDocument } from "./document.ts";

/**
 * Browser entry credentials live in the URL fragment or query. Consume and erase them before the
 * router reads the location, and stash them where the browser-only atoms read them. A connection
 * link's OAuth return also arrives at the dashboard callback path, so the connection reader claims
 * its own attempt first.
 */
const consumeBrowserEntry = () => {
  Effect.runSync(readPairingToken);
  Effect.runSync(readAccountConnection);
  Effect.runSync(readOAuthCallback);
};

/** One router and atom registry per document request on the server, and one per page in the browser. */
export function getRouter() {
  const { atoms, connect, Wrap } = dashboardRegistry(
    import.meta.env.SSR ? documentValues(serverDocument()) : [],
  );
  if (!import.meta.env.SSR) consumeBrowserEntry();
  return connect(
    createRouter({
      routeTree,
      context: { atoms },
      defaultPreload: "intent",
      // Existing links use ordinary strings, including tool names such as "123".
      parseSearch: parseSearchParams,
      stringifySearch: stringifySearchWith(JSON.stringify),
      scrollRestoration: true,
      scrollToTopSelectors: ["main.main"],
      defaultErrorComponent: PageError,
      Wrap,
    }),
  );
}

/** The router registered for typed links, route params and navigation. */
export type AppRouter = ReturnType<typeof getRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
  interface StaticDataRouteOption {
    section?: NavigationSection;
  }
}
