import { Suspense } from "react";
import { usePageUrl } from "@executor-js/dashboard-start/page";
import { EmptyState } from "@executor-js/ui/dashboard/empty-state";
import { useStartedQuery } from "@executor-js/ui/dashboard/context";
import { reportBrowserUsage } from "../../contracts/product-analytics.ts";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Loader } from "raf-effect-atom";
import { useState } from "react";
import { Cause, Exit } from "effect";
import { AsyncResult } from "effect/reactivity";
import { grantTarget } from "@executor-js/mcp-auth/grants";
import {
  McpConsentLayout,
  McpConsentLoading,
  McpConsentSummary,
  consentDestination,
} from "@executor-js/ui/dashboard/mcp-consent";
import { Button } from "@executor-js/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@executor-js/ui/components/select";
import { McpConnectionFailed, mcpClientAtom, mcpConsentAtom } from "../../contracts/mcp.ts";
import { organizationsAtom } from "../../contracts/organization.ts";
import { useResourceOrigins } from "../resource-origin.ts";

/**
 * The user approves the URL's requested connection. App/tool scoping remains a backend capability.
 * The request may name a resource at any of the deployment's resource origins.
 */
/** Start the registered client and the caller's organizations from the raw authorize query. */
export function loadMcpAuthorization(atoms: Loader.Loader, search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const clientId = params.get("client_id") ?? "";
  return {
    organizations: atoms.prefetch(organizationsAtom),
    client: atoms.prefetch(mcpClientAtom(clientId)),
  };
}

export type McpAuthorizationReads = ReturnType<typeof loadMcpAuthorization>;

export function McpAuthorizePage({ reads }: { readonly reads: McpAuthorizationReads }) {
  return (
    <Suspense fallback={<McpConsentLoading />}>
      <McpAuthorize reads={reads} />
    </Suspense>
  );
}

function McpAuthorize({ reads }: { readonly reads: McpAuthorizationReads }) {
  const page = usePageUrl();
  const resourceOrigins = useResourceOrigins();
  // Keep the signed query intact; repeated OAuth fields must not be reserialized by the router.
  const query = page.search.slice(1),
    params = new URLSearchParams(query);
  const clientId = params.get("client_id") ?? "";
  const target = grantTarget(resourceOrigins, params.getAll("resource"));
  const destination = consentDestination(params.get("redirect_uri"));
  const client = useStartedQuery({ source: mcpClientAtom(clientId), handle: reads.client }).result;
  const organizations = useStartedQuery({
    source: organizationsAtom,
    handle: reads.organizations,
  }).result;
  const consent = useAtomSet(mcpConsentAtom, { mode: "promiseExit" });
  const state = useAtomValue(mcpConsentAtom);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const available = AsyncResult.isSuccess(organizations) ? organizations.value : [];
  const organization = selected || available[0]?.id || "";
  // A scoped connection belongs to one organization; the server binds consent to it.
  const scoped = target?.kind === "mcp" && target.connection !== undefined;
  const decide = async (accept: boolean) => {
    const action = accept ? "approve_connection" : "decline_connection";
    reportBrowserUsage({ area: "mcp", action, outcome: "started" });
    setError(null);
    const result = await consent({
      accept,
      organization: scoped ? undefined : organization,
      query,
    });
    reportBrowserUsage({
      area: "mcp",
      action,
      outcome: Exit.isSuccess(result) ? "success" : "failure",
    });
    if (Exit.isFailure(result)) {
      const failure = Cause.squash(result.cause);
      setError(
        failure instanceof McpConnectionFailed
          ? failure.message
          : "Unable to complete this connection. Try again.",
      );
    } else window.location.assign(result.value.url);
  };
  if (
    clientId === "" ||
    target === undefined ||
    AsyncResult.isFailure(client) ||
    AsyncResult.isFailure(organizations)
  )
    return (
      <McpConsentLayout description="This connection request could not be loaded.">
        <p role="alert">Start again from your MCP client.</p>
      </McpConsentLayout>
    );
  if (!AsyncResult.isSuccess(client) || !AsyncResult.isSuccess(organizations))
    return <McpConsentLoading />;
  return (
    <McpConsentLayout
      description={
        <p>
          <strong>{client.value.client_name ?? "An application"}</strong> wants to connect to
          Executor.
        </p>
      }
    >
      {available.length > 0 && !scoped && (
        <div className="mcp-consent-organization grid gap-2 text-[13px] [font-weight:550] [&_[data-slot='select-trigger']]:w-full">
          <label htmlFor="mcp-organization">Organization</label>
          <Select value={organization} onValueChange={setSelected} disabled={state.waiting}>
            <SelectTrigger id="mcp-organization">
              <SelectValue placeholder="Choose an organization" />
            </SelectTrigger>
            <SelectContent>
              {available.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {available.length === 0 ? (
        <EmptyState size="compact" title="No organizations">
          Ask an organization admin for an invitation, then return here to connect.
        </EmptyState>
      ) : (
        <McpConsentSummary target={target} destination={destination} />
      )}
      {error && (
        <p role="alert" className="auth-error text-destructive text-[13px]">
          {error}
        </p>
      )}
      <div className="mcp-consent-actions flex items-center justify-end gap-2.5 border-t border-t-border pt-5 [&_>_p]:mr-auto [&_>_p]:text-muted-foreground [&_>_p]:text-[12px] max-[480px]:flex-wrap">
        <Button variant="outline" disabled={state.waiting} onClick={() => decide(false)}>
          Cancel
        </Button>
        {available.length > 0 && (
          <Button
            disabled={(!scoped && organization === "") || state.waiting}
            loading={state.waiting}
            onClick={() => decide(true)}
          >
            Connect
          </Button>
        )}
      </div>
    </McpConsentLayout>
  );
}
