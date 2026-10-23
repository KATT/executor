import { createFileRoute } from "@tanstack/react-router";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { loadMembers, OrganizationPage } from "@executor-js/hosted-web/pages/organization";

/** Organization administration shared by both hosts. */
export const Route = createFileRoute("/org/$organizationSlug/organization")({
  loader: ({ context, params }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadMembers(context.atoms, organization),
    ),
  component: OrganizationRoute,
});

function OrganizationRoute() {
  return <OrganizationPage reads={Route.useLoaderData()} />;
}
