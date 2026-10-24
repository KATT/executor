/** Sharing state and mutations are keyed by organization and resource, with confirmed updates. */
import { hydrated } from "@executor-js/ui/contracts/http";
import { revalidated } from "@executor-js/ui/contracts/refresh";
import { pollingQuery, whileLoaded } from "@executor-js/ui/contracts/polling";
import { Data, Effect } from "effect";
import { Atom, AsyncResult } from "effect/reactivity";
import type { Account, AccountId, AppId } from "@executor-js/sdk";
import type { OrganizationReference } from "@executor-js/hosted-server/organization";
import type {
  AppAudience,
  SharedAudience,
  AccessRevision,
} from "@executor-js/hosted-server/resource-access";
import { acknowledge, follows } from "@executor-js/ui/contracts/mutations";
import { providerDisplayUrl } from "@executor-js/ui/contracts/dashboard";
import { HostedClient } from "./api.ts";
import { protectedQuery } from "./protected-query.ts";
import { inventoryAtom } from "./organization.ts";
import { groupsAtom } from "./groups.ts";

class DirectoryKey extends Data.Class<{
  readonly organization: OrganizationReference;
  readonly view: "available" | "managed";
}> {}
class AppKey extends Data.Class<{
  readonly organization: OrganizationReference;
  readonly app: AppId;
}> {}
class AccountKey extends Data.Class<{
  readonly organization: OrganizationReference;
  readonly account: AccountId;
}> {}
const directoryQuery = Atom.family((key: DirectoryKey) =>
  HostedClient.query(
    "resourceAccess",
    "directory",
    hydrated({
      params: { organization: key.organization },
      query: { view: key.view },
    }),
  ),
);
/** The directory endpoint. Loaders start this atom; the page reads the inventory derived from it. */
export const resourceDirectoryQuery = (
  organization: OrganizationReference,
  view: "available" | "managed" = "available",
) => directoryQuery(new DirectoryKey({ organization, view }));
const directory = Atom.family((key: DirectoryKey) =>
  directoryQuery(key).pipe(
    revalidated,
    (source) => pollingQuery(source, { active: whileLoaded(({ pendingApp }) => pendingApp) }),
    protectedQuery,
  ),
);
const appAccess = Atom.family((key: AppKey) =>
  HostedClient.query("resourceAccess", "app", hydrated({ params: key })).pipe(
    revalidated,
    protectedQuery,
  ),
);
const accountAccess = Atom.family((key: AccountKey) =>
  HostedClient.query("resourceAccess", "account", hydrated({ params: key })).pipe(
    revalidated,
    protectedQuery,
  ),
);
/** Explicit management mode never changes the normal app or account list. */
export const resourceDirectoryAtom = (
  organization: OrganizationReference,
  view: "available" | "managed" = "available",
) => directory(new DirectoryKey({ organization, view }));
/** Per-app authority and sharing. */
export const appAccessAtom = (key: { organization: OrganizationReference; app: AppId }) =>
  appAccess(new AppKey(key));
/** Per-account authority; personal policies are returned only to their owner. */
export const accountAccessAtom = (key: {
  organization: OrganizationReference;
  account: AccountId;
}) => accountAccess(new AccountKey(key));
/**
 * Read the lists again after a change to apps or sharing. They stay visible while they reconcile;
 * the server's access verdict still clears them when the change removed this user's access.
 */
export const refreshResourceDirectory = (
  get: Atom.FnContext,
  organization: OrganizationReference,
) => {
  get.refresh(resourceDirectoryAtom(organization));
  get.refresh(resourceDirectoryAtom(organization, "managed"));
  get.refresh(inventoryAtom(organization));
};
/**
 * Apply a confirmed rename or deletion to account rows in place. Access is unchanged, so the
 * lists stay visible while they reconcile instead of being discarded.
 */
export const acknowledgeResourceAccount = (
  get: Atom.FnContext,
  organization: OrganizationReference,
  account: AccountId,
  saved: Account | undefined,
) => {
  for (const view of ["available", "managed"] as const)
    acknowledge(get, resourceDirectoryAtom(organization, view), (data) => ({
      ...data,
      accounts:
        saved === undefined
          ? data.accounts.filter((entry) => entry.account.id !== account)
          : data.accounts.map((entry) =>
              entry.account.id === account ? { ...entry, account: saved } : entry,
            ),
    }));
  get.refresh(inventoryAtom(organization));
};
const shareApp = Atom.family((key: AppKey) =>
  HostedClient.runtime.fn(
    (payload: { audience: typeof AppAudience.Type; revision: typeof AccessRevision.Type }, get) =>
      Effect.flatMap(HostedClient, (client) =>
        client.resourceAccess.shareApp({ params: key, payload }),
      ).pipe(
        Effect.tap((saved) =>
          Effect.sync(() => {
            acknowledge(get, appAccess(key), () => saved);
            refreshResourceDirectory(get, key.organization);
          }),
        ),
        Effect.tapError(() =>
          Effect.sync(() => {
            get.refresh(appAccess(key));
            get.refresh(groupsAtom(key.organization));
          }),
        ),
      ),
  ),
);
const shareAccount = Atom.family((key: AccountKey) =>
  HostedClient.runtime.fn(
    (
      payload: { audience: typeof SharedAudience.Type; revision: typeof AccessRevision.Type },
      get,
    ) =>
      Effect.flatMap(HostedClient, (client) =>
        client.resourceAccess.shareAccount({ params: key, payload }),
      ).pipe(
        Effect.tap((saved) =>
          Effect.sync(() => {
            acknowledge(get, accountAccess(key), () => saved);
            refreshResourceDirectory(get, key.organization);
          }),
        ),
        Effect.tapError(() =>
          Effect.sync(() => {
            get.refresh(accountAccess(key));
            get.refresh(groupsAtom(key.organization));
          }),
        ),
      ),
  ),
);
/** App sharing is an independent mutation per app. */
export const shareAppAtom = (key: { organization: OrganizationReference; app: AppId }) =>
  shareApp(new AppKey(key));
/** Account sharing is an independent mutation per account. */
export const shareAccountAtom = (key: {
  organization: OrganizationReference;
  account: AccountId;
}) => shareAccount(new AccountKey(key));

class ListKey extends Data.Class<{
  readonly organization: OrganizationReference;
  readonly view: "available" | "managed";
  readonly group: string;
}> {}
const inventory = Atom.family((key: ListKey) =>
  follows(
    Atom.map(
      resourceDirectoryAtom(key.organization, key.view),
      AsyncResult.map((data) => {
        const apps = data.apps
          .filter(
            ({ access }) =>
              key.group === "all" ||
              (key.group === "private"
                ? access.audience.kind === "private"
                : access.audience.kind === "everyone" ||
                  (access.audience.kind === "groups" &&
                    access.audience.groups.some((id) => id === key.group))),
          )
          .map(({ app }) => app);
        const links = data.apps
          .filter(({ app }) => apps.some((item) => item.id === app.id))
          .flatMap(({ app, linkedAccounts }) =>
            linkedAccounts.map((account) => ({ app: app.id, account })),
          );
        const accounts = data.accounts.map(({ account, provider, health }) => ({
          ...account,
          providerName: provider.definition.name,
          providerUrl: providerDisplayUrl(provider.definition),
          ...(health === undefined ? {} : { health }),
        }));
        return { apps, accounts, links, pendingApp: key.group !== "private" && data.pendingApp };
      }),
    ),
    resourceDirectoryAtom(key.organization, key.view),
  ),
);
/** A UI group filter narrows already-authorized rows; it grants no additional access. */
export const resourceInventoryAtom = (
  organization: OrganizationReference,
  view: "available" | "managed" = "available",
  group = "all",
) => inventory(new ListKey({ organization, view, group }));
