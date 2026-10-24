import { createFileRoute } from "@tanstack/react-router";
import { catalogAtom } from "@executor-js/hosted-web/contracts/api";
import { V1ImportPage } from "../components/v1-import.tsx";
import { v1ImportChoicesAtom } from "../../contracts/v1-import.ts";

/** Import a single-member Executor v1 workspace; outside the dashboard, like team setup. */
export const Route = createFileRoute("/v1-import")({
  codeSplitGroupings: [],
  loader: ({ context }) => ({
    choices: context.atoms.prefetchInBrowser(v1ImportChoicesAtom),
    catalog: context.atoms.prefetchInBrowser(catalogAtom),
  }),
  component: V1ImportRoute,
});

function V1ImportRoute() {
  const { choices, catalog } = Route.useLoaderData();
  return <V1ImportPage choices={choices} catalog={catalog} />;
}
