import { Suspense } from "react";
import { InteractionId } from "@executor-js/mcp/browser";
import { HostedApprovalQuery } from "@executor-js/hosted-server/mcp/browser";
import { BrowserApprovalPage } from "@executor-js/ui/dashboard/browser-approval";
import { ApprovalCardPending } from "@executor-js/ui/dashboard/loading";
import { browserApprovalAtoms } from "@executor-js/ui/contracts/browser-approval";
import { Option, Schema } from "effect";
import { Loader } from "raf-effect-atom";
import { BrowserAtoms } from "../../contracts/telemetry.ts";
const approvals = browserApprovalAtoms(BrowserAtoms);
const Address = Schema.Struct({ requestId: InteractionId, ...HostedApprovalQuery.fields });

const approvalEndpoint = (requestId: string, search: string) => {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const address = Schema.decodeUnknownOption(Address)({
    requestId,
    sessionId: params.get("sessionId"),
    grantId: params.get("grantId"),
  });
  if (Option.isNone(address)) return undefined;
  const { requestId: id, ...routing } = address.value;
  return `/api/mcp/approvals/${encodeURIComponent(id)}?${new URLSearchParams(routing)}`;
};

/** Start the review named by the approval link. An invalid link starts nothing. */
export function loadHostedApproval(atoms: Loader.Loader, requestId: string, search: string) {
  const endpoint = approvalEndpoint(requestId, search);
  if (endpoint === undefined) return undefined;
  return { endpoint, view: atoms.prefetch(approvals(endpoint).view) };
}

/** Both hosted products use their existing AuthBoundary and the same browser review page. */
export function McpApprovePage({
  reads,
}: {
  readonly reads: NonNullable<ReturnType<typeof loadHostedApproval>> | undefined;
}) {
  if (reads === undefined)
    return (
      <main className="p-8">
        <h1 className="text-[22px] font-semibold tracking-[-0.035em] leading-[1.35]">
          This approval link is invalid.
        </h1>
      </main>
    );
  return (
    <Suspense fallback={<ApprovalCardPending />}>
      <BrowserApprovalPage atoms={approvals(reads.endpoint)} view={reads.view} />
    </Suspense>
  );
}
