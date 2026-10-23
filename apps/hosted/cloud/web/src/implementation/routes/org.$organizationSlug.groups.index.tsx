import { createFileRoute } from "@tanstack/react-router";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { GroupsPage, loadGroups } from "@executor-js/hosted-web/pages/groups";

/** Group directory shared by hosted products. */
export const Route = createFileRoute("/org/$organizationSlug/groups/")({
  loader: ({ context, params }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadGroups(context.atoms, organization, false),
    ),
  component: GroupsRoute,
});

function GroupsRoute() {
  return <GroupsPage reads={Route.useLoaderData()} />;
}
