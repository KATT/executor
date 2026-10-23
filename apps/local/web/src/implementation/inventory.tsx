import { Skeleton } from "@executor-js/ui/components/skeleton";
import type { DashboardOverview } from "@executor-js/local-server/contracts";
import { Link, Outlet, useMatches, useLocation, useLoaderData } from "@tanstack/react-router";
import { useAtomResult } from "raf-effect-atom";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { Suspense, createContext, useContext } from "react";
import { started } from "@executor-js/ui/contracts/started-read";
import { overviewAtom } from "../contracts/api.ts";
import { InventoryPageSkeleton } from "@executor-js/ui/dashboard/loading";
import { AppDetailPending } from "@executor-js/ui/dashboard/app-loading";
import { parseAppSearch } from "../contracts/navigation.ts";
import {
  ForbiddenBoundary,
  SessionBoundary,
  StorageBoundary,
  useStorageBoundary,
} from "./components/read-boundaries.tsx";

const OverviewContext = createContext<DashboardOverview | undefined>(undefined);

/** Mount inventory consumers only after authenticated overview data is available. */
export function InventoryLayout() {
  return (
    <SessionBoundary>
      <ForbiddenBoundary>
        <StorageBoundary>
          <Suspense fallback={<InventoryPageSkeleton kind="apps" />}>
            <InventoryReads />
          </Suspense>
        </StorageBoundary>
      </ForbiddenBoundary>
    </SessionBoundary>
  );
}

function InventoryReads() {
  const location = useLocation();
  const { overview } = useLoaderData({ from: "/_dashboard/_inventory" });
  const claims = useStorageBoundary();
  const read = started(claims.wrap(overviewAtom), overview);
  const result = useAtomResult(read.source, read.handle);
  const data = AsyncResult.value(result);
  const section = useMatches({ select: (matches) => matches.at(-1)?.staticData.section });
  if (Option.isSome(data))
    return (
      <OverviewContext value={data.value}>
        <Outlet />
      </OverviewContext>
    );
  if (AsyncResult.isFailure(result)) return null;
  if (/^\/apps\/app_[^/]+\/?$/.test(location.pathname)) {
    const search = parseAppSearch(location.search);
    return (
      <AppDetailPending
        view={search.view ?? (search.tool === undefined ? "overview" : "tools")}
        selectedTool={search.tool}
        accountAction={<Skeleton className="h-9 w-36 max-[740px]:h-11" />}
        back={<Link to="/apps">Apps</Link>}
      />
    );
  }
  return <InventoryPageSkeleton kind={section === "accounts" ? "accounts" : "apps"} />;
}

/** Read the live inventory guaranteed by the enclosing inventory route. */
export function useOverview(): DashboardOverview {
  const overview = useContext(OverviewContext);
  if (overview === undefined) throw new Error("Inventory route must enclose this page");
  return overview;
}
