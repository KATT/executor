import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { catalogAtom } from "@executor-js/hosted-web/contracts/api";
import { ensureOrganizationAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { organizationsAtom } from "@executor-js/hosted-web/contracts/organization";
import { v1ImportChoicesAtom } from "../../contracts/v1-import.ts";
import { DashboardEntryPending } from "@executor-js/hosted-web/entry";
import { CloudPagePending } from "../components/page-pending.tsx";
import { ErrorTrackingProvider } from "@executor-js/ui/dashboard/error-tracking";
import { DashboardShell } from "@executor-js/hosted-web/shell";
import { OrganizationBoundary, OrganizationContent } from "@executor-js/hosted-web/organization";
import { NameAccountDialog } from "@executor-js/hosted-web/pages/name-account-dialog";
import { HostedNavigation } from "@executor-js/hosted-web/navigation";
import { CloudSupport } from "../components/support.tsx";
import { CloudNavigation } from "../components/navigation.tsx";
import { V1ImportNotice } from "../components/v1-import-links.tsx";

/** The URL owns this tab's organization; all product pages inherit this boundary. Cloud records
 * product failures in PostHog, so its error cards can say a failure was tracked. */
export const Route = createFileRoute("/org/$organizationSlug")({
  loader: async ({ context, params }) => {
    const catalog = context.atoms.prefetchInBrowser(catalogAtom);
    const v1Import = context.atoms.prefetchInBrowser(v1ImportChoicesAtom);
    context.atoms.prefetch(organizationsAtom);
    await ensureOrganizationAccess(context.atoms, params.organizationSlug);
    return { catalog, v1Import };
  },
  component: OrganizationLayout,
  // The server streams the dashboard frame and navigation first, then the organization.
  pendingComponent: OrganizationPending,
});
function OrganizationLayout() {
  const { organizationSlug } = Route.useParams();
  const { catalog, v1Import } = Route.useLoaderData();
  return (
    <OrganizationBoundary slug={organizationSlug} catalog={catalog}>
      <ErrorTrackingProvider>
        <DashboardShell
          navigation={
            <HostedNavigation>
              <CloudNavigation organizationSlug={organizationSlug} />
            </HostedNavigation>
          }
          support={<CloudSupport />}
          notice={<V1ImportNotice choices={v1Import} />}
        >
          <OrganizationContent pending={<CloudPagePending />}>
            <Outlet />
            <NameAccountDialog />
          </OrganizationContent>
        </DashboardShell>
      </ErrorTrackingProvider>
    </OrganizationBoundary>
  );
}

function OrganizationPending() {
  const { pathname } = useLocation();
  return (
    <DashboardEntryPending
      pathname={pathname}
      support={<CloudSupport />}
      navigation={<CloudNavigation pendingPage={pathname.split("/")[3] ?? "apps"} />}
    >
      <CloudPagePending />
    </DashboardEntryPending>
  );
}
