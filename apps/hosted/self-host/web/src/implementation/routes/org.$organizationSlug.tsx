import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { catalogAtom } from "@executor-js/hosted-web/contracts/api";
import { ensureOrganizationAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { organizationsAtom } from "@executor-js/hosted-web/contracts/organization";
import { DashboardEntryPending } from "@executor-js/hosted-web/entry";
import { PagePending } from "@executor-js/hosted-web/page-pending";
import { DashboardShell } from "@executor-js/hosted-web/shell";
import { OrganizationBoundary, OrganizationContent } from "@executor-js/hosted-web/organization";
import { NameAccountDialog } from "@executor-js/hosted-web/pages/name-account-dialog";
import { Navigation } from "../navigation.tsx";

/** The URL owns this tab's organization; all product pages inherit this boundary. */
export const Route = createFileRoute("/org/$organizationSlug")({
  loader: async ({ context, params }) => {
    const catalog = context.atoms.prefetchInBrowser(catalogAtom);
    context.atoms.prefetch(organizationsAtom);
    await ensureOrganizationAccess(context.atoms, params.organizationSlug);
    return { catalog };
  },
  component: OrganizationLayout,
  // The server streams the dashboard frame and navigation first, then the organization.
  pendingComponent: OrganizationPending,
});
function OrganizationLayout() {
  const { organizationSlug } = Route.useParams();
  const { catalog } = Route.useLoaderData();
  return (
    <OrganizationBoundary slug={organizationSlug} catalog={catalog}>
      <DashboardShell allowCreateOrganization={false} navigation={<Navigation />}>
        <OrganizationContent pending={<PagePending />}>
          <Outlet />
          <NameAccountDialog />
        </OrganizationContent>
      </DashboardShell>
    </OrganizationBoundary>
  );
}

function OrganizationPending() {
  const { pathname } = useLocation();
  return (
    <DashboardEntryPending pathname={pathname}>
      <PagePending />
    </DashboardEntryPending>
  );
}
