import { createErrorBoundary } from "effect-atom-boundary";
import { AuthenticationUnavailable, Unauthorized } from "@executor-js/hosted-server/auth";
import { OrganizationForbidden } from "@executor-js/hosted-server/organization";
import { ErrorNotice } from "@executor-js/ui/dashboard/error-notice";
import { mcpConnectionsQuery } from "../../contracts/mcp-connections.ts";

function SessionFailure({
  error,
  reset,
}: {
  readonly error: Unauthorized;
  readonly reset: () => void;
}) {
  return <ErrorNotice error={error} context="While reading this organization." retry={reset} />;
}

function AvailabilityFailure({
  error,
  reset,
}: {
  readonly error: AuthenticationUnavailable;
  readonly reset: () => void;
}) {
  return <ErrorNotice error={error} context="While reading this organization." retry={reset} />;
}

function AccessFailure({
  error,
  reset,
}: {
  readonly error: OrganizationForbidden;
  readonly reset: () => void;
}) {
  return <ErrorNotice error={error} context="While reading this organization." retry={reset} />;
}

// TODO(raf-effect-atom gap: AtomHttpApi query errors omit HttpClientError)
const [SessionBoundary, useSessionBoundary] = createErrorBoundary({
  name: "HostedSession",
  errors: mcpConnectionsQuery,
  catchTags: { Unauthorized: SessionFailure },
});

const [AvailabilityBoundary, useAvailabilityBoundary] = createErrorBoundary({
  name: "HostedAuthentication",
  errors: mcpConnectionsQuery,
  parent: SessionBoundary,
  catchTags: { AuthenticationUnavailable: AvailabilityFailure },
});

const [AccessBoundary, useAccessBoundary] = createErrorBoundary({
  name: "HostedAccess",
  errors: mcpConnectionsQuery,
  parent: AvailabilityBoundary,
  catchTags: { OrganizationForbidden: AccessFailure },
});

export {
  AccessBoundary,
  AvailabilityBoundary,
  SessionBoundary,
  useAccessBoundary,
  useAvailabilityBoundary,
  useSessionBoundary,
};
