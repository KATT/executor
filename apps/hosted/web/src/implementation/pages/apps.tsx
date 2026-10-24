import { Suspense } from "react";
import { useAtomRefresh } from "@effect/atom-react";
import { Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { Loader, type LoadedHandle } from "raf-effect-atom";
import { OrganizationReference } from "@executor-js/hosted-server/organization";
import { HostedFailure } from "../components/dashboard-bindings.tsx";
import { AppsPage as SharedPage } from "@executor-js/ui/dashboard/apps";
import { AppCardSkeleton, AppCardsSkeleton } from "@executor-js/ui/dashboard/loading";
import { Button } from "@executor-js/ui/components/button";
import { EmptyState } from "@executor-js/ui/dashboard/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@executor-js/ui/components/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@executor-js/ui/components/select";
import { useClaimedResult, useStartedQuery } from "@executor-js/ui/dashboard/context";
import { Link, useNavigate } from "@tanstack/react-router";
import { startRead } from "../../contracts/guarded-read.ts";
import { useArrivalCover } from "../components/arrival-refresh.ts";
import { useOrganizationRoute } from "../components/organization.tsx";
import { resourceDirectoryAtom, resourceInventoryAtom } from "../../contracts/resource-access.ts";
import { groupsAtom } from "../../contracts/groups.ts";
import {
  AccessBoundary,
  AvailabilityBoundary,
  SessionBoundary,
  useAccessBoundary,
} from "../components/read-boundaries.tsx";

const organizationFromSlug = (slug: string) =>
  Schema.decodeUnknownSync(OrganizationReference)(slug);

export type AppsListSearch = {
  readonly view: "available" | "managed";
  readonly group: string;
};

/** How long a document waits for the background Executor app before sending the list it has. */
const installWaitMs = 20_000;
const installPollMs = 250;

type InventoryList = ReturnType<typeof resourceInventoryAtom>;

const appStillInstalling = (handle: LoadedHandle<InventoryList>) => {
  const result = Loader.result(handle);
  return AsyncResult.isSuccess(result) && result.value.pendingApp;
};

/**
 * Start the filtered inventory and the groups that name the filter. A document waits while the
 * directory says the Executor app is still installing: that app is a background job, and the list
 * the server sends is the list the page shows. The browser keeps the current list and paints the
 * installing placeholder.
 */
export async function loadApps(
  atoms: Loader.Loader,
  organization: OrganizationReference,
  search: AppsListSearch,
) {
  const list = resourceInventoryAtom(organization, search.view, search.group);
  const groups = startRead(atoms, groupsAtom(organization));
  if (typeof window !== "undefined") {
    return { groups: await groups, inventory: await startRead(atoms, list) };
  }
  const settled = (error: unknown): undefined => {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return undefined;
  };
  let inventory: LoadedHandle<InventoryList> | undefined = await atoms.ensure(list).catch(settled);
  const deadline = Date.now() + installWaitMs;
  while (inventory !== undefined && appStillInstalling(inventory) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, installPollMs));
    inventory = await atoms.fetch(list);
  }
  return { groups: await groups, inventory: inventory ?? atoms.prefetch(list) };
}

export type AppsReads = Awaited<ReturnType<typeof loadApps>>;

/** One authorized list. Group and access filters are search params. */
export function AppsPage({
  view,
  group,
  reads,
}: {
  readonly view: "available" | "managed";
  readonly group: string;
  readonly reads: AppsReads | undefined;
}) {
  if (reads === undefined) return null;
  return (
    <SessionBoundary>
      <AvailabilityBoundary>
        <AccessBoundary>
          <Suspense fallback={<AppCardsSkeleton />}>
            <Apps view={view} group={group} reads={reads} />
          </Suspense>
        </AccessBoundary>
      </AvailabilityBoundary>
    </SessionBoundary>
  );
}

function Apps({
  view,
  group,
  reads,
}: {
  readonly view: "available" | "managed";
  readonly group: string;
  readonly reads: AppsReads;
}) {
  const { slug: organizationSlug } = useOrganizationRoute();
  const organization = organizationFromSlug(organizationSlug);
  const navigate = useNavigate();
  const groupsState = useStartedQuery({
    source: groupsAtom(organization),
    handle: reads.groups,
  });
  const groupsResult = useClaimedResult(
    groupsAtom(organization),
    groupsState.result,
    useAccessBoundary,
  );
  const groups = {
    result: groupsResult,
    data: AsyncResult.value(groupsResult),
    refresh: groupsState.refresh,
  };
  const inventory = resourceInventoryAtom(organization, view, group);
  // The first time this document opens the list from another page, read it for that arrival and
  // cover what the previous page left behind. A later visit keeps the list it already showed.
  const refreshDirectory = useAtomRefresh(resourceDirectoryAtom(organization, view));
  const listedState = useStartedQuery({
    source: inventory,
    handle: reads.inventory,
  });
  const listedResult = useClaimedResult(inventory, listedState.result, useAccessBoundary);
  const listed = {
    result: listedResult,
    data: AsyncResult.value(listedResult),
    refresh: listedState.refresh,
  };
  const covering = useArrivalCover("apps", listed.result.waiting, refreshDirectory);
  const { data } = listed;
  const apply = (next: AppsListSearch) => {
    void navigate({
      to: "/org/$organizationSlug/apps",
      params: { organizationSlug },
      search: {
        ...(next.view === "available" ? {} : { view: next.view }),
        ...(next.group === "all" ? {} : { group: next.group }),
      },
    });
  };
  const activeFilters = Number(group !== "all") + Number(view !== "available");
  return (
    <SharedPage
      query={inventory}
      read={{ source: inventory, handle: reads.inventory, claim: useAccessBoundary }}
      conceal={covering}
      Failure={HostedFailure}
      pending={
        Option.isSome(data) && data.value.pendingApp ? (
          <div role="status" aria-label="Installing app">
            <AppCardSkeleton />
          </div>
        ) : undefined
      }
      connect={
        <Button asChild variant="outline">
          <Link to="/org/$organizationSlug/connect" params={{ organizationSlug }}>
            Connect your agent
          </Link>
        </Button>
      }
      empty={
        <EmptyState
          title={
            group !== "all" || view === "managed"
              ? "No apps match these filters"
              : "No apps available"
          }
          action={
            group !== "all" || view === "managed" ? (
              <Button
                variant="outline"
                onClick={() => {
                  apply({ group: "all", view: "available" });
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button asChild>
                <Link to="/org/$organizationSlug/apps/add" params={{ organizationSlug }}>
                  Add app
                </Link>
              </Button>
            )
          }
        >
          {group !== "all" || view === "managed"
            ? "Choose another view to see your apps."
            : "Add an app or ask a teammate to share one with you."}
        </EmptyState>
      }
      action={
        <Button asChild>
          <Link to="/org/$organizationSlug/apps/add" params={{ organizationSlug }}>
            Add app
          </Link>
        </Button>
      }
      filters={
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative w-full max-[600px]:w-11 max-[600px]:px-0">
              <HugeiconsIcon icon={FilterHorizontalIcon} size={16} aria-hidden />
              <span className="max-[600px]:sr-only">Filters</span>
              {activeFilters > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-xs text-secondary-foreground max-[600px]:absolute max-[600px]:-top-1.5 max-[600px]:-right-1.5 max-[600px]:size-4 max-[600px]:text-[10px]">
                  {activeFilters}
                  <span className="sr-only"> active</span>
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent aria-label="App filters" className="w-72 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium">Filters</h2>
              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    apply({ group: "all", view: "available" });
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Group</p>
              <Select value={group} onValueChange={(group) => apply({ view, group })}>
                <SelectTrigger aria-label="Filter apps by group" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All apps</SelectItem>
                  <SelectItem value="private">Private apps</SelectItem>
                  {Option.isSome(groups.data) &&
                    groups.data.value.groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Access</p>
              <Select
                value={view}
                onValueChange={(value) => {
                  if (value === "available" || value === "managed") apply({ view: value, group });
                }}
              >
                <SelectTrigger aria-label="App list" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available to me</SelectItem>
                  <SelectItem value="managed">Manage apps</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      }
    />
  );
}
