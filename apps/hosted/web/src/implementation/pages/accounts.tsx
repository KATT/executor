import { Suspense, useState } from "react";
import { useAtomRefresh } from "@effect/atom-react";
import type { AccountId } from "@executor-js/sdk";
import {
  HostedAccountActions,
  HostedAccountDialog,
  type AccountDialogKind,
} from "./account-actions.tsx";
import { Option, Schema } from "effect";
import { Loader } from "raf-effect-atom";
import { OrganizationReference } from "@executor-js/hosted-server/organization";
import { AccountsPage as SharedPage } from "@executor-js/ui/dashboard/accounts";
import { AccountRowsSkeleton } from "@executor-js/ui/dashboard/loading";
import { EmptyState } from "@executor-js/ui/dashboard/empty-state";
import { Button } from "@executor-js/ui/components/button";
import { Link } from "@tanstack/react-router";
import { useClaimedResult, useStartedQuery } from "@executor-js/ui/dashboard/context";
import { HostedFailure } from "../components/dashboard-bindings.tsx";
import { startRead } from "../../contracts/guarded-read.ts";
import { useArrivalCover } from "../components/arrival-refresh.ts";
import { useOrganizationDetails, useOrganizationRoute } from "../components/organization.tsx";
import { OAuthClientsDialog } from "./oauth-clients.tsx";
import { resourceDirectoryAtom, resourceInventoryAtom } from "../../contracts/resource-access.ts";
import {
  AccessBoundary,
  AvailabilityBoundary,
  SessionBoundary,
  useAccessBoundary,
} from "../components/read-boundaries.tsx";

const organizationFromSlug = (slug: string) =>
  Schema.decodeUnknownSync(OrganizationReference)(slug);

/** Start the account list and the directory that labels each account. */
export async function loadAccounts(atoms: Loader.Loader, organization: OrganizationReference) {
  const [inventory, directory] = await Promise.all([
    startRead(atoms, resourceInventoryAtom(organization)),
    startRead(atoms, resourceDirectoryAtom(organization)),
  ]);
  return { inventory, directory };
}

export type AccountsReads = Awaited<ReturnType<typeof loadAccounts>>;

/**
 * Personal and shared credentials use one list. Administrators also manage the organization's
 * OAuth clients from here, since those clients only exist to connect accounts.
 */
export function AccountsPage({
  highlight,
  oauthClients,
  reads,
}: {
  readonly highlight?: AccountId | undefined;
  readonly oauthClients: { readonly open: boolean; readonly onOpenChange: (open: boolean) => void };
  readonly reads: AccountsReads | undefined;
}) {
  if (reads === undefined) return null;
  return (
    <SessionBoundary>
      <AvailabilityBoundary>
        <AccessBoundary>
          <Suspense fallback={<AccountRowsSkeleton />}>
            <Accounts highlight={highlight} oauthClients={oauthClients} reads={reads} />
          </Suspense>
        </AccessBoundary>
      </AvailabilityBoundary>
    </SessionBoundary>
  );
}

function Accounts({
  highlight,
  oauthClients,
  reads,
}: {
  readonly highlight?: AccountId | undefined;
  readonly oauthClients: { readonly open: boolean; readonly onOpenChange: (open: boolean) => void };
  readonly reads: AccountsReads;
}) {
  const { slug: organizationSlug } = useOrganizationRoute();
  const organization = organizationFromSlug(organizationSlug);
  const directoryState = useStartedQuery({
    source: resourceDirectoryAtom(organization),
    handle: reads.directory,
  });
  const directoryResult = useClaimedResult(directoryState.result, useAccessBoundary);
  const directory = {
    result: directoryResult,
    data: directoryState.data,
    refresh: directoryState.refresh,
  };
  // The first time this document opens the list from another page, read it for that arrival and
  // cover what the previous page left behind. A later visit keeps the list it already showed.
  const refreshDirectory = useAtomRefresh(resourceDirectoryAtom(organization));
  const covering = useArrivalCover("accounts", directory.result.waiting, refreshDirectory);
  const [dialog, setDialog] = useState<{ account: AccountId; kind: AccountDialogKind }>();
  const role = useOrganizationDetails()?.role;
  const admin = role !== undefined && role !== "member";
  const manageClients = admin && (
    <Button variant="outline" onClick={() => oauthClients.onOpenChange(true)}>
      OAuth clients
    </Button>
  );
  return (
    <>
      <SharedPage
        query={resourceInventoryAtom(organization)}
        read={{
          source: resourceInventoryAtom(organization),
          handle: reads.inventory,
          claim: useAccessBoundary,
        }}
        conceal={covering}
        Failure={HostedFailure}
        action={manageClients}
        empty={
          <EmptyState
            title="No accounts available"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/org/$organizationSlug/apps" params={{ organizationSlug }}>
                    Choose an app
                  </Link>
                </Button>
                {manageClients}
              </div>
            }
          >
            Open an app to connect an account, or ask a teammate to share one.
          </EmptyState>
        }
        highlight={highlight}
        accountActions={(account) => {
          const entry = Option.isSome(directory.data)
            ? directory.data.value.accounts.find((item) => item.account.id === account.id)
            : undefined;
          return (
            <HostedAccountActions
              account={account}
              access={entry?.access}
              open={(kind) => setDialog({ account: account.id, kind })}
            />
          );
        }}
        accountMeta={(account) => {
          const access = Option.isSome(directory.data)
            ? directory.data.value.accounts.find((item) => item.account.id === account.id)?.access
            : undefined;
          return (
            access && (
              <span className="rounded border px-1.5 py-0.5 text-[10px]">
                {access.ownership.kind === "personal" ? "Personal" : "Shared"}
              </span>
            )
          );
        }}
      />
      {dialog && (
        <HostedAccountDialog
          key={`${dialog.account}:${dialog.kind}`}
          id={dialog.account}
          dialog={dialog.kind}
          onClose={() => setDialog(undefined)}
        />
      )}
      {admin && <OAuthClientsDialog {...oauthClients} />}
    </>
  );
}
