import { DashboardProvider } from "@executor-js/ui/dashboard/context";
import type { AppLinkProps, AccountLinkProps } from "@executor-js/ui/contracts/dashboard";
import { Link, useLoaderData } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { catalogAtom } from "../contracts/onboarding.ts";

const AppLink = ({ app, view, tool, version, ...props }: AppLinkProps) => (
  <Link to="/apps/$appId" params={{ appId: app }} search={{ view, tool, version }} {...props} />
);
const AccountLink = ({ account, ...props }: AccountLinkProps) => (
  <Link to="/accounts" search={{ account }} {...props} />
);
/** Typed navigation and local data are supplied outside the shared UI. */
export function LocalDashboard({ children }: { readonly children: ReactNode }) {
  const { catalog } = useLoaderData({ from: "/_dashboard" });
  return (
    <DashboardProvider
      catalog={catalogAtom}
      catalogHandle={catalog}
      AppLink={AppLink}
      AccountLink={AccountLink}
    >
      {children}
    </DashboardProvider>
  );
}
