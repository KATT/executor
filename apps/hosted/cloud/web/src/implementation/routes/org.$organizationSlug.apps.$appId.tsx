import { AccountConnectionDialog } from "@executor-js/hosted-web/pages/connection-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { prefetchAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { OpenAppAction } from "@executor-js/hosted-web/pages/app-sign-in";
import { AppDetailPage, appDetailPageReads } from "@executor-js/hosted-web/pages/app-detail";
import { parseAppSearch } from "@executor-js/hosted-web/contracts/navigation";
import { parseAppParams } from "@executor-js/hosted-web/route-params";

export const Route = createFileRoute("/org/$organizationSlug/apps/$appId")({
  params: { parse: parseAppParams },
  validateSearch: parseAppSearch,
  loader: ({ context, params }) =>
    prefetchAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      appDetailPageReads(organization, params),
    ),
  component: AppPage,
});
function AppPage() {
  const { appId } = Route.useParams();
  const { view, tool, connection, client } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <>
      <AppDetailPage
        appId={appId}
        view={view}
        tool={tool}
        openApp={(app) => <OpenAppAction app={app} />}
      />
      <AccountConnectionDialog
        connectionId={connection}
        client={client}
        onClose={() => {
          void navigate({ search: { view, tool }, replace: true });
        }}
      />
    </>
  );
}
