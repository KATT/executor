import { createFileRoute } from "@tanstack/react-router";
import { AddAppPage, loadAddApp } from "@executor-js/hosted-web/pages/add-app";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";

/** App selection and installation belong to Apps, as in local. */
export const Route = createFileRoute("/org/$organizationSlug/apps/add/")({
  loader: ({ context, params }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadAddApp(context.atoms, organization),
    ),
  component: AddAppRoute,
});

function AddAppRoute() {
  return <AddAppPage reads={Route.useLoaderData()} />;
}
