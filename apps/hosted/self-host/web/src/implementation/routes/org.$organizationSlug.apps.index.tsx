import { createFileRoute } from "@tanstack/react-router";
import { parseAppsSearch } from "@executor-js/hosted-web/contracts/navigation";
import { AppsPage, loadApps } from "@executor-js/hosted-web/pages/apps";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";

export const Route = createFileRoute("/org/$organizationSlug/apps/")({
  validateSearch: parseAppsSearch,
  loaderDeps: ({ search }) => ({
    view: search.view ?? "available",
    group: search.group ?? "all",
  }),
  loader: ({ context, params, deps }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadApps(context.atoms, organization, deps),
    ),
  component: AppsRoute,
});

function AppsRoute() {
  const { view, group } = Route.useSearch();
  return (
    <AppsPage view={view ?? "available"} group={group ?? "all"} reads={Route.useLoaderData()} />
  );
}
