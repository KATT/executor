import { Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { Loader } from "raf-effect-atom";
import { AsyncResult } from "effect/reactivity";
import type { OrganizationReference } from "@executor-js/hosted-server/organization";
import { ApprovalsPage as SharedApprovalsPage } from "@executor-js/ui/dashboard/approvals";
import { ApprovalsPending } from "@executor-js/ui/dashboard/loading";
import { BrowserApprovalCard } from "@executor-js/ui/dashboard/browser-approval";
import { allResults, useStartedQuery } from "@executor-js/ui/dashboard/context";
import { approvalRunsAtom, scheduledReviewAtoms } from "../../contracts/schedules.ts";
import { inventoryAtom } from "../../contracts/organization.ts";
import { HostedFailure } from "../components/dashboard-bindings.tsx";
import { useOrganizationRoute } from "../components/organization.tsx";
import { ScheduledApprovalFrame } from "../components/page-pending.tsx";

/** Start the pending runs and the inventory that names their apps. */
export function loadApprovals(atoms: Loader.Loader, organization: OrganizationReference) {
  return {
    runs: atoms.prefetch(approvalRunsAtom(organization)),
    inventory: atoms.prefetch(inventoryAtom(organization)),
  };
}

export type ApprovalsReads = ReturnType<typeof loadApprovals>;

/** The review of one scheduled run. */
export function loadScheduledReview(
  atoms: Loader.Loader,
  organization: OrganizationReference,
  run: string,
) {
  return {
    view: atoms.prefetch(scheduledReviewAtoms({ organization, run }).view),
  };
}

export type ScheduledReviewReads = ReturnType<typeof loadScheduledReview>;

/** Pending runs are reviewed by a signed-in human through the product's normal auth boundary. */
export function ApprovalsPage({ reads }: { readonly reads: ApprovalsReads | undefined }) {
  if (reads === undefined) return null;
  return (
    <Suspense fallback={<ApprovalsPending />}>
      <Approvals reads={reads} />
    </Suspense>
  );
}

function Approvals({ reads }: { readonly reads: ApprovalsReads }) {
  const { organization, slug: organizationSlug } = useOrganizationRoute();
  const runs = useStartedQuery({
    source: approvalRunsAtom(organization),
    handle: reads.runs,
  });
  const inventory = useStartedQuery({
    source: inventoryAtom(organization),
    handle: reads.inventory,
  });
  const result = AsyncResult.map(
    allResults({ runs: runs.result, inventory: inventory.result }),
    ({ runs, inventory }) =>
      runs.map((run) => ({
        run,
        app: {
          id: run.app,
          name: inventory.apps.find((app) => app.id === run.app)?.name ?? "App unavailable",
        },
      })),
  );
  return (
    <SharedApprovalsPage
      result={result}
      retry={() => {
        runs.refresh();
        inventory.refresh();
      }}
      Failure={HostedFailure}
      review={(item) => (
        <Link
          to="/org/$organizationSlug/approvals/$runId"
          params={{ organizationSlug, runId: item.run.id }}
        >
          Review
        </Link>
      )}
    />
  );
}

/** Scheduled answers continue in the background; no MCP client is required. */
export function ScheduledApprovalPage({
  runId,
  view,
}: {
  readonly runId: string;
  readonly view: ScheduledReviewReads["view"] | undefined;
}) {
  const { organization, slug: organizationSlug } = useOrganizationRoute();
  if (view === undefined) return null;
  return (
    <ScheduledApprovalFrame organizationSlug={organizationSlug}>
      <BrowserApprovalCard
        atoms={scheduledReviewAtoms({ organization, run: runId })}
        view={view}
        completion="Your response was saved. Approved runs continue in the background."
      />
    </ScheduledApprovalFrame>
  );
}
