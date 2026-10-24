import { AccountConnectionDialog } from "@executor-js/hosted-web/pages/connection-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { OpenAppAction } from "@executor-js/hosted-web/pages/app-sign-in";
import { AppDetailPage, loadHostedApp } from "@executor-js/hosted-web/pages/app-detail";
import { parseAppSearch } from "@executor-js/hosted-web/contracts/navigation";
import { parseAppParams } from "@executor-js/hosted-web/route-params";

export const Route = createFileRoute("/org/$organizationSlug/apps/$appId")({
  params: { parse: parseAppParams },
  validateSearch: parseAppSearch,
  loaderDeps: ({ search }) => ({
    version: search.version,
    tool: search.tool,
    view: search.view,
    connection: search.connection,
  }),
  loader: ({ context, params, deps }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadHostedApp(context.atoms, organization, params.appId, deps, params.organizationSlug),
    ),
  component: AppPage,
});
function AppPage() {
  const { appId } = Route.useParams();
  const { view, tool, version, connection, client } = Route.useSearch();
  const navigate = Route.useNavigate();
  const reads = Route.useLoaderData();
  return (
    <>
      <AppDetailPage
        appId={appId}
        view={view}
        tool={tool}
        version={version}
        reads={reads}
        openApp={(app) => <OpenAppAction app={app} location={reads?.location} />}
      />
      <AccountConnectionDialog
        connectionId={connection}
        client={client}
        read={reads?.connection}
        onClose={() => {
          void navigate({ search: { view, tool, version }, replace: true });
        }}
      />
    </>
  );
}
