import { usePageUrl } from "@executor-js/dashboard-start/page";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Suspense, useState } from "react";
import { Exit } from "effect";
import { AsyncResult } from "effect/reactivity";
import { grantTarget, singleResourceOrigin } from "@executor-js/mcp-auth/grants";
import {
  McpConsentLayout,
  McpConsentLoading,
  McpConsentSummary,
  consentDestination,
} from "@executor-js/ui/dashboard/mcp-consent";
import { Button } from "@executor-js/ui/components/button";
import { useAtomResult, type Handle } from "raf-effect-atom";
import { localMcpClientAtom, localMcpConsentAtom } from "../../contracts/mcp.ts";

/** Pairing establishes the operator; the MCP URL determines this connection's approval mode. */
export function LocalMcpAuthorizePage({
  client,
}: {
  readonly client:
    | { readonly id: string; readonly client: Handle<ReturnType<typeof localMcpClientAtom>> }
    | undefined;
}) {
  const page = usePageUrl();
  const query = page.search.slice(1);
  const params = new URLSearchParams(query);
  const target = grantTarget(singleResourceOrigin(page.origin), params.getAll("resource"));
  const destination = consentDestination(params.get("redirect_uri"));
  if (client === undefined || target?.kind !== "mcp")
    return (
      <McpConsentLayout description="This connection request could not be loaded.">
        <p role="alert">Start again from your MCP client.</p>
      </McpConsentLayout>
    );
  return (
    <Suspense fallback={<McpConsentLoading />}>
      <LocalMcpConsent
        id={client.id}
        client={client.client}
        query={query}
        target={target}
        {...(destination === undefined ? {} : { destination })}
      />
    </Suspense>
  );
}

function LocalMcpConsent({
  id,
  client,
  query,
  target,
  destination,
}: {
  readonly id: string;
  readonly client: Handle<ReturnType<typeof localMcpClientAtom>>;
  readonly query: string;
  readonly target: NonNullable<ReturnType<typeof grantTarget>>;
  readonly destination?: string;
}) {
  const loaded = useAtomResult(localMcpClientAtom(id), client);
  const submit = useAtomSet(localMcpConsentAtom, { mode: "promiseExit" });
  const pending = useAtomValue(localMcpConsentAtom);
  const [error, setError] = useState<string | null>(null);
  const decide = async (accept: boolean) => {
    setError(null);
    const result = await submit({ accept, query });
    if (Exit.isFailure(result))
      setError("This connection could not be completed. Start again from your MCP client.");
    else window.location.assign(result.value.url);
  };
  if (AsyncResult.isFailure(loaded))
    return (
      <McpConsentLayout description="This connection request could not be loaded.">
        <p role="alert">Start again from your MCP client.</p>
      </McpConsentLayout>
    );
  return (
    <McpConsentLayout
      description={
        <p>
          <strong>{loaded.value.client_name ?? "An application"}</strong> wants to connect to
          Executor Local.
        </p>
      }
    >
      <McpConsentSummary target={target} {...(destination === undefined ? {} : { destination })} />
      {error && (
        <p role="alert" className="auth-error text-destructive text-[13px]">
          {error}
        </p>
      )}
      <div className="mcp-consent-actions flex items-center justify-end gap-2.5 border-t border-t-border pt-5 [&_>_p]:mr-auto [&_>_p]:text-muted-foreground [&_>_p]:text-[12px] max-[480px]:flex-wrap">
        <Button variant="outline" disabled={pending.waiting} onClick={() => decide(false)}>
          Cancel
        </Button>
        <Button loading={pending.waiting} disabled={pending.waiting} onClick={() => decide(true)}>
          Connect
        </Button>
      </div>
    </McpConsentLayout>
  );
}
