import { createFileRoute, Outlet } from "@tanstack/react-router";
import { catalogAtom } from "@executor-js/hosted-web/contracts/api";
import { ensureOrganizationAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { OrganizationBoundary } from "@executor-js/hosted-web/organization";
import { OrganizationSetup } from "@executor-js/hosted-web/pages/organization-setup";
import { SetupPage } from "@executor-js/hosted-web/setup-page";

/** First-run setup steps belong to the new organization, outside the dashboard shell. */
export const Route = createFileRoute("/org/$organizationSlug_/setup")({
  codeSplitGroupings: [],
  loader: async ({ context, params }) => {
    const catalog = context.atoms.prefetchInBrowser(catalogAtom);
    await ensureOrganizationAccess(context.atoms, params.organizationSlug);
    return { catalog };
  },
  component: SetupLayout,
  pendingComponent: () => <SetupPage />,
});

function SetupLayout() {
  const { organizationSlug } = Route.useParams();
  const { catalog } = Route.useLoaderData();
  return (
    <OrganizationBoundary slug={organizationSlug} catalog={catalog}>
      <OrganizationSetup>
        <Outlet />
      </OrganizationSetup>
    </OrganizationBoundary>
  );
}
