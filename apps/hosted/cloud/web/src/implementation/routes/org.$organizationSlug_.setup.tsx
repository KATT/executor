import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ErrorTrackingProvider } from "@executor-js/ui/dashboard/error-tracking";
import { OrganizationBoundary } from "@executor-js/hosted-web/organization";
import { OrganizationSetup } from "@executor-js/hosted-web/pages/organization-setup";
import { SetupPage } from "@executor-js/hosted-web/setup-page";
import { CloudSetupSequence } from "../components/team-setup.tsx";
import { prefetchAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { setupSequenceAtom } from "../../contracts/onboarding.ts";

/**
 * A new team's setup steps belong to it, outside the dashboard shell. Their order is read with
 * the team's access, so the first step renders in place.
 */
export const Route = createFileRoute("/org/$organizationSlug_/setup")({
  codeSplitGroupings: [],
  loader: ({ context, params }) =>
    prefetchAfterAccess(context.atoms, params.organizationSlug, (organization) => [
      setupSequenceAtom(organization),
    ]),
  component: SetupLayout,
  pendingComponent: () => <SetupPage />,
});

function SetupLayout() {
  const { organizationSlug } = Route.useParams();
  return (
    <OrganizationBoundary slug={organizationSlug}>
      <ErrorTrackingProvider>
        <OrganizationSetup>
          <CloudSetupSequence>
            <Outlet />
          </CloudSetupSequence>
        </OrganizationSetup>
      </ErrorTrackingProvider>
    </OrganizationBoundary>
  );
}
