import { createFileRoute } from "@tanstack/react-router";
import { ConnectPage } from "@executor-js/hosted-web/pages/connect";

/** A new scoped connection has its own address, so it can be opened in another tab. */
export const Route = createFileRoute("/org/$organizationSlug/connect_/new")({
  component: function NewScopedConnectionPage() {
    return <ConnectPage screen={{ kind: "new" }} />;
  },
});
