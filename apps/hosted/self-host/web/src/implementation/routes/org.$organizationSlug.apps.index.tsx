import { createFileRoute } from "@tanstack/react-router";
import { prefetchAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import { AppsPage, appsPageReads } from "@executor-js/hosted-web/pages/apps";

/** Hosted app inventory placeholder. */
export const Route = createFileRoute("/org/$organizationSlug/apps/")({
  loader: ({ context, params }) =>
    prefetchAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      appsPageReads(organization, {}),
    ),
  component: AppsPage,
});
