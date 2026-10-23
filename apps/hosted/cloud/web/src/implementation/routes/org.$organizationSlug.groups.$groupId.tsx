import { createFileRoute } from "@tanstack/react-router";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { GroupsPage, loadGroups } from "@executor-js/hosted-web/pages/groups";

/** Group membership detail stays scoped to the organization route. */
export const Route = createFileRoute("/org/$organizationSlug/groups/$groupId")({
  loader: ({ context, params }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadGroups(context.atoms, organization, true),
    ),
  component: GroupRoute,
});

function GroupRoute() {
  return <GroupsPage id={Route.useParams().groupId} reads={Route.useLoaderData()} />;
}
