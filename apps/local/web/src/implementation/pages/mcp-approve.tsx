import { Suspense } from "react";
import { GrantId } from "@executor-js/mcp-auth";
import { BrowserApprovalAddress } from "@executor-js/mcp/browser";
import { BrowserApprovalPage } from "@executor-js/ui/dashboard/browser-approval";
import { ApprovalCardPending } from "@executor-js/ui/dashboard/loading";
import { browserApprovalAtoms } from "@executor-js/ui/contracts/browser-approval";
import { Option, Schema } from "effect";
import { Loader } from "raf-effect-atom";
import { BrowserAtoms } from "../../contracts/telemetry.ts";
import { AuthenticationGate } from "../app.tsx";
const approvals = browserApprovalAtoms(BrowserAtoms);
const Address = Schema.Struct({ ...BrowserApprovalAddress.fields, grantId: GrantId });

const approvalEndpoint = (requestId: string, search: string) => {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const address = Schema.decodeUnknownOption(Address)({
    requestId,
    grantId: params.get("grantId"),
    sessionId: params.get("sessionId"),
  });
  if (Option.isNone(address)) return undefined;
  const { requestId: id, sessionId, grantId } = address.value;
  return `/dashboard/api/mcp/approvals/${encodeURIComponent(id)}?${new URLSearchParams({ sessionId, grantId })}`;
};

/** Start the review named by the approval link. An invalid link starts nothing. */
export function loadLocalApproval(atoms: Loader.Loader, requestId: string, search: string) {
  const endpoint = approvalEndpoint(requestId, search);
  if (endpoint === undefined) return undefined;
  return { endpoint, view: atoms.prefetch(approvals(endpoint).view) };
}

/** Local pairing stays independent of MCP bearer credentials. */
export function McpApprovePage({
  reads,
}: {
  readonly reads: NonNullable<ReturnType<typeof loadLocalApproval>> | undefined;
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
    <AuthenticationGate>
      <Suspense fallback={<ApprovalCardPending />}>
        <BrowserApprovalPage atoms={approvals(reads.endpoint)} view={reads.view} />
      </Suspense>
    </AuthenticationGate>
  );
}
