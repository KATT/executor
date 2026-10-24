import { createErrorBoundary } from "effect-atom-boundary";
import { AuthenticationUnavailable, Unauthorized } from "@executor-js/hosted-server/auth";
import { OrganizationForbidden } from "@executor-js/hosted-server/organization";
import { ErrorNotice } from "@executor-js/ui/dashboard/error-notice";
import { HostedClient } from "../../contracts/api.ts";

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

// Transport and decode failures are defects, so they are not endpoint tags.
const [SessionBoundary, useSessionBoundary] = createErrorBoundary({
  name: "HostedSession",
  errors: HostedClient,
  catchTags: { Unauthorized: SessionFailure },
});

const [AvailabilityBoundary, useAvailabilityBoundary] = createErrorBoundary({
  name: "HostedAuthentication",
  errors: HostedClient,
  parent: SessionBoundary,
  catchTags: { AuthenticationUnavailable: AvailabilityFailure },
});

const [AccessBoundary, useAccessBoundary] = createErrorBoundary({
  name: "HostedAccess",
  errors: HostedClient,
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
