import { createErrorBoundary } from "effect-atom-boundary";
import { Cause } from "effect";
import { AuthStorageError } from "@executor-js/local-server/auth";
import { DashboardForbidden, DashboardUnauthorized } from "@executor-js/local-server/contracts";
import { StorageError } from "@executor-js/sdk";
import { Alert, AlertDescription, AlertTitle } from "@executor-js/ui/components/alert";
import { Button } from "@executor-js/ui/components/button";
import { ErrorNotice } from "@executor-js/ui/dashboard/error-notice";
import { DashboardClient, LiveConnectionLost, overviewAtom } from "../../contracts/api.ts";

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

// Transport and decode failures are defects, so they are not endpoint tags.
const [SessionBoundary, useSessionBoundary] = createErrorBoundary({
  name: "LocalSession",
  errors: DashboardClient,
  catchTags: { DashboardUnauthorized: SessionFailure },
});

const [ForbiddenBoundary, useForbiddenBoundary] = createErrorBoundary({
  name: "LocalAccess",
  errors: DashboardClient,
  parent: SessionBoundary,
  catchTags: { DashboardForbidden: ForbiddenFailure },
});

const [StorageBoundary, useStorageBoundary] = createErrorBoundary({
  name: "LocalStorage",
  errors: DashboardClient,
  parent: ForbiddenBoundary,
  catchTags: { AuthStorageError: StorageFailure },
});

function DataFailure({
  error,
  reset,
}: {
  readonly error: StorageError;
  readonly reset: () => void;
}) {
  return <ErrorNotice error={error} context="While reading this page." retry={reset} />;
}

function LiveFailure({
  reset,
}: {
  readonly error: LiveConnectionLost;
  readonly reset: () => void;
}) {
  return (
    <Alert>
      <AlertTitle>Live updates stopped</AlertTitle>
      <AlertDescription>
        The connection to Executor dropped. Retry to subscribe again.
      </AlertDescription>
      <Button variant="outline" size="sm" onClick={reset}>
        Retry
      </Button>
    </Alert>
  );
}

function MissingFailure({
  reset,
}: {
  readonly error: Cause.NoSuchElementError;
  readonly reset: () => void;
}) {
  return (
    <Alert>
      <AlertTitle>This page lost its data</AlertTitle>
      <AlertDescription>Retry to read it again.</AlertDescription>
      <Button variant="outline" size="sm" onClick={reset}>
        Retry
      </Button>
    </Alert>
  );
}

const [DataBoundary, useDataBoundary] = createErrorBoundary({
  name: "LocalData",
  errors: overviewAtom,
  parent: StorageBoundary,
  catchTags: { StorageError: DataFailure },
});

const [LiveBoundary, useLiveBoundary] = createErrorBoundary({
  name: "LocalLive",
  errors: overviewAtom,
  parent: DataBoundary,
  catchTags: { LiveConnectionLost: LiveFailure },
});

const [MissingBoundary, useMissingBoundary] = createErrorBoundary({
  name: "LocalMissing",
  errors: overviewAtom,
  parent: LiveBoundary,
  catchTags: { NoSuchElementError: MissingFailure },
});

export {
  DataBoundary,
  ForbiddenBoundary,
  LiveBoundary,
  MissingBoundary,
  SessionBoundary,
  StorageBoundary,
  useDataBoundary,
  useForbiddenBoundary,
  useLiveBoundary,
  useMissingBoundary,
  useSessionBoundary,
  useStorageBoundary,
};
