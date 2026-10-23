import { createErrorBoundary } from "effect-atom-boundary";
import { AuthStorageError } from "@executor-js/local-server/auth";
import { DashboardForbidden, DashboardUnauthorized } from "@executor-js/local-server/contracts";
import { ErrorNotice } from "@executor-js/ui/dashboard/error-notice";
import { mcpConnectionsQuery } from "../../contracts/mcp-connections.ts";

function SessionFailure({
  error,
  reset,
}: {
  readonly error: DashboardUnauthorized;
  readonly reset: () => void;
}) {
  return <ErrorNotice error={error} context="While reading this page." retry={reset} />;
}

function ForbiddenFailure({
  error,
  reset,
}: {
  readonly error: DashboardForbidden;
  readonly reset: () => void;
}) {
  return <ErrorNotice error={error} context="While reading this page." retry={reset} />;
}

function StorageFailure({
  error,
  reset,
}: {
  readonly error: AuthStorageError;
  readonly reset: () => void;
}) {
  return <ErrorNotice error={error} context="While reading this page." retry={reset} />;
}

// TODO(raf-effect-atom gap: AtomHttpApi query errors omit HttpClientError)
const [SessionBoundary, useSessionBoundary] = createErrorBoundary({
  name: "LocalSession",
  errors: mcpConnectionsQuery,
  catchTags: { DashboardUnauthorized: SessionFailure },
});

const [ForbiddenBoundary, useForbiddenBoundary] = createErrorBoundary({
  name: "LocalAccess",
  errors: mcpConnectionsQuery,
  parent: SessionBoundary,
  catchTags: { DashboardForbidden: ForbiddenFailure },
});

const [StorageBoundary, useStorageBoundary] = createErrorBoundary({
  name: "LocalStorage",
  errors: mcpConnectionsQuery,
  parent: ForbiddenBoundary,
  catchTags: { AuthStorageError: StorageFailure },
});

export {
  ForbiddenBoundary,
  SessionBoundary,
  StorageBoundary,
  useForbiddenBoundary,
  useSessionBoundary,
  useStorageBoundary,
};
