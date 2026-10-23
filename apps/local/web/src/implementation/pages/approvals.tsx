import { Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { Loader } from "raf-effect-atom";
import { AsyncResult } from "effect/reactivity";
import { ApprovalsPage as SharedApprovalsPage } from "@executor-js/ui/dashboard/approvals";
import { ApprovalsPending } from "@executor-js/ui/dashboard/loading";
import { BrowserApprovalCard } from "@executor-js/ui/dashboard/browser-approval";
import { allResults, useStartedQuery } from "@executor-js/ui/dashboard/context";
import { overviewAtom } from "../../contracts/api.ts";
import { approvalRunsAtom, scheduledReviewAtoms } from "../../contracts/schedules.ts";
import { Failure } from "../components/common.tsx";

/** Start the pending runs and the overview that names their apps. */
export function loadApprovals(atoms: Loader.Loader) {
  return {
    runs: atoms.prefetch(approvalRunsAtom),
    overview: atoms.prefetch(overviewAtom),
  };
}

export type ApprovalsReads = ReturnType<typeof loadApprovals>;

/** The review of one scheduled run. */
export function loadScheduledReview(atoms: Loader.Loader, run: string) {
  return { view: atoms.prefetch(scheduledReviewAtoms(run).view) };
}

export type ScheduledReviewReads = ReturnType<typeof loadScheduledReview>;

/** Pending runs are reviewed by a signed-in human through the product's normal auth boundary. */
export function ApprovalsPage({ reads }: { readonly reads: ApprovalsReads }) {
  return (
    <Suspense fallback={<ApprovalsPending />}>
      <Approvals reads={reads} />
    </Suspense>
  );
}

function Approvals({ reads }: { readonly reads: ApprovalsReads }) {
  const runs = useStartedQuery({ source: approvalRunsAtom, handle: reads.runs });
  const overview = useStartedQuery({ source: overviewAtom, handle: reads.overview });
  const result = AsyncResult.map(
    allResults({ runs: runs.result, overview: overview.result }),
    ({ runs, overview }) =>
      runs.map((run) => ({
        run,
        app: {
          id: run.app,
          name: overview.apps.find((app) => app.id === run.app)?.name ?? "App unavailable",
        },
      })),
  );
  return (
    <SharedApprovalsPage
      result={result}
      retry={() => {
        runs.refresh();
        overview.refresh();
      }}
      Failure={Failure}
      review={(item) => (
        <Link to="/approvals/$runId" params={{ runId: item.run.id }}>
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
  readonly view: ScheduledReviewReads["view"];
}) {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 md:p-6">
      <Link to="/approvals" className="mb-4 inline-flex text-sm text-muted-foreground">
        Back to approvals
      </Link>
      <BrowserApprovalCard
        atoms={scheduledReviewAtoms(runId)}
        view={view}
        completion="Your response was saved. Approved runs continue in the background."
      />
    </main>
  );
}
