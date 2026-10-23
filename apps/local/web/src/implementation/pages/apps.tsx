import { Link, useLoaderData } from "@tanstack/react-router";
import { Failure } from "../components/common.tsx";
import { dashboardAtoms } from "../../contracts/dashboard-bindings.ts";
import { AppsPage as SharedPage } from "@executor-js/ui/dashboard/apps";
import { useMissingBoundary } from "../components/read-boundaries.tsx";
import { Button } from "@executor-js/ui/components/button";
/** Local product supplies its own action and typed route. */
export function AppsPage() {
  const { overview } = useLoaderData({ from: "/_dashboard/_inventory" });
  const claims = useMissingBoundary();
  return (
    <SharedPage
      query={dashboardAtoms.inventory}
      read={{ source: claims.wrap(dashboardAtoms.inventory), handle: overview }}
      Failure={Failure}
      connect={
        <Button asChild variant="outline">
          <Link to="/connect">Connect your agent</Link>
        </Button>
      }
      action={
        <Button asChild>
          <Link to="/apps/add">Add app</Link>
        </Button>
      }
    />
  );
}
