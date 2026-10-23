import { AppResources } from "./app-resources.tsx";
import { AppAccounts } from "./app-accounts.tsx";
import { AppSkills } from "@executor-js/ui/dashboard/app-skills";
import {
  AppOverviewEntries,
  AppWorkflowPreview,
} from "@executor-js/ui/dashboard/app-overview-entries";
import { appBrowserBindings } from "../../contracts/app-browser.ts";
import { appLinksAtom, userLinksAtom, type AppAccountLink } from "../../contracts/app-accounts.ts";
import {
  missingRequirements,
  requirementAccounts,
  type RequirementLink,
} from "@executor-js/ui/contracts/app-accounts";
import { AppAccessSettings } from "./resource-settings.tsx";
import { appAccessAtom } from "../../contracts/resource-access.ts";
import {
  emptyManyRequirements,
  type AccountSummary,
  type AppView,
} from "@executor-js/ui/contracts/dashboard";
import { AppSchedules, AppSchedulesLoading } from "@executor-js/ui/dashboard/schedules";
import { scheduleBindings } from "../../contracts/schedules.ts";
import { sessionAtom } from "../../contracts/auth.ts";
import { groupsAtom } from "../../contracts/groups.ts";
import { AppDetailLoading, OverviewCardLoading } from "@executor-js/ui/dashboard/app-loading";
import { Exit, Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { Loader } from "raf-effect-atom";
import type { OrganizationReference } from "@executor-js/hosted-server/organization";
import { HostedFailure, useDashboardAtoms } from "../components/dashboard-bindings.tsx";
import { dashboardAtoms } from "../../contracts/dashboard-bindings.ts";
import { useAtomSet } from "@effect/atom-react";
import { AccountConnectionId, AppId, ToolName, VersionId, type App } from "@executor-js/sdk";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@executor-js/ui/components/button";
import { Skeleton } from "@executor-js/ui/components/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@executor-js/ui/components/dialog";
import type { HostedError } from "../../contracts/errors.ts";
import { RenameApp } from "@executor-js/ui/dashboard/rename-app";
import { CopyApp } from "@executor-js/ui/dashboard/copy-app";
import { PublishApp } from "@executor-js/ui/dashboard/publish-app";
import { AppSettings } from "@executor-js/ui/dashboard/app-settings";
import { AppDetailLayout } from "@executor-js/ui/dashboard/app-detail";
import {
  AppOverview,
  AppOverviewAccounts,
  AppOverviewTools,
  AppOverviewSource,
} from "@executor-js/ui/dashboard/app-overview";
import { appManagement } from "../../contracts/app-management.ts";
import {
  allResults,
  QueryView,
  QueryResult,
  useStartedQuery,
} from "@executor-js/ui/dashboard/context";
import {
  connectionAtom,
  toolsAtom,
  liveAppAtom,
  sourceAtom,
  toolCatalogAtom,
  toolDetailAtom,
  versionsAtom,
  acknowledgeApp,
  appError,
  removeAppAtom,
  renameAppAtom,
} from "../../contracts/apps.ts";
import { useOrganizationRoute } from "../components/organization.tsx";
import {
  AccessBoundary,
  AvailabilityBoundary,
  SessionBoundary,
  useAccessBoundary,
} from "../components/read-boundaries.tsx";
import { AppTools } from "./app-tools.tsx";
import { AppSource, AppVersions } from "./app-source.tsx";

const namedTool = (tool: string | undefined) =>
  tool === undefined
    ? undefined
    : Option.getOrUndefined(Schema.decodeUnknownOption(ToolName)(tool));

/** Start the app page's reads after this organization's access check succeeded. */
export async function loadHostedApp(
  atoms: Loader.Loader,
  organization: OrganizationReference,
  app: AppId,
  search: {
    readonly version?: VersionId | undefined;
    readonly tool?: string | undefined;
    readonly view?: AppView | undefined;
    readonly connection?: AccountConnectionId | undefined;
  },
) {
  const key = { organization, app };
  const record = atoms.prefetch(liveAppAtom(key));
  const inventory = atoms.prefetch(dashboardAtoms(organization).inventory);
  const appLinks = atoms.prefetch(appLinksAtom(key));
  const userLinks = atoms.prefetch(userLinksAtom(key));
  const access = atoms.prefetch(appAccessAtom(key));
  const session = atoms.prefetch(sessionAtom);
  const versions = atoms.prefetch(versionsAtom(key));
  const groups = atoms.prefetch(groupsAtom(organization));
  const connection =
    search.connection === undefined
      ? undefined
      : atoms.prefetch(connectionAtom({ organization, connection: search.connection }));
  const shown = search.view ?? (search.tool === undefined ? "overview" : "tools");
  const management = appManagement(organization);
  const inspecting = shown === "source" || shown === "history";
  const workspace = inspecting
    ? {
        working: atoms.prefetch(management.source(app)),
        history: atoms.prefetch(management.history(app)),
      }
    : { working: undefined, history: undefined };
  const authoring = shown === "overview" ? atoms.prefetch(management.authoring(app)) : undefined;
  const tool = namedTool(search.tool);
  const known = search.version;
  const activeVersion = async () => {
    const loaded = await atoms.ensure(liveAppAtom(key));
    const result = Loader.result(loaded);
    const active = AsyncResult.isSuccess(result) ? result.value.activeVersion : undefined;
    return active == null ? undefined : active;
  };
  const started = (version: VersionId) => ({
    version,
    tools: atoms.prefetch(toolCatalogAtom({ ...key, version })),
    source: atoms.prefetch(sourceAtom({ ...key, version })),
    detail:
      tool === undefined ? undefined : atoms.prefetch(toolDetailAtom({ ...key, version, tool })),
  });
  const liveSource = (version: VersionId | undefined) =>
    inspecting && version !== undefined
      ? atoms.prefetch(sourceAtom({ ...key, version }))
      : undefined;
  if (known !== undefined) {
    const liveVersion = inspecting ? await activeVersion() : undefined;
    return {
      record,
      inventory,
      appLinks,
      userLinks,
      access,
      session,
      versions,
      groups,
      connection,
      ...workspace,
      authoring,
      live: liveSource(liveVersion),
      liveVersion,
      ...started(known),
    };
  }
  const active = await activeVersion();
  return {
    record,
    inventory,
    appLinks,
    userLinks,
    access,
    session,
    versions,
    groups,
    connection,
    ...workspace,
    authoring,
    live: liveSource(active),
    liveVersion: inspecting ? active : undefined,
    ...(active === undefined
      ? { version: undefined, tools: undefined, source: undefined, detail: undefined }
      : started(active)),
  };
}

export type HostedAppReads = Awaited<ReturnType<typeof loadHostedApp>>;

/** Views that read only the app. The others also read the inventory and the app's links. */
const appWideViews: ReadonlySet<AppView> = new Set(["settings", "versions", "source", "history"]);

/**
 * Links with their sign-in state and checks by this app. Accounts the caller can use show the
 * inventory's details, which renames keep current; others only the link's.
 */
const withSummaries = (
  links: readonly AppAccountLink[],
  summaries: readonly AccountSummary[],
): readonly RequirementLink<AccountSummary>[] =>
  links.map((link) => ({
    requirement: link.requirement,
    account: {
      ...link.account,
      ...summaries.find((summary) => summary.id === link.account.id),
      signIn: link.signIn,
      ...(link.health === undefined ? {} : { health: link.health }),
    },
  }));

/** Views that run app code use the accounts linked to the app. */
export function AppDetailPage({
  appId,
  view,
  tool,
  version,
  reads,
  openApp,
}: {
  readonly appId: AppId;
  readonly view?: AppView | undefined;
  readonly tool?: string | undefined;
  readonly version?: VersionId | undefined;
  readonly reads: HostedAppReads | undefined;
  readonly openApp?: ((app: App) => ReactNode) | undefined;
}) {
  if (reads === undefined) return null;
  return (
    <SessionBoundary>
      <AvailabilityBoundary>
        <AccessBoundary>
          <AppDetail
            appId={appId}
            view={view}
            tool={tool}
            version={version}
            reads={reads}
            openApp={openApp}
          />
        </AccessBoundary>
      </AvailabilityBoundary>
    </SessionBoundary>
  );
}

function AppDetail({
  appId,
  view,
  tool,
  version,
  reads,
  openApp,
}: {
  readonly appId: AppId;
  readonly view?: AppView | undefined;
  readonly tool?: string | undefined;
  readonly version?: VersionId | undefined;
  readonly reads: HostedAppReads;
  readonly openApp?: ((app: App) => ReactNode) | undefined;
}) {
  const { organization, role, slug: organizationSlug } = useOrganizationRoute();
  const navigate = useNavigate();
  const claims = useAccessBoundary();
  const [skillDirty, setSkillDirty] = useState(false);
  useBlocker({
    shouldBlockFn: () => skillDirty && !window.confirm("Discard your unsaved changes?"),
    enableBeforeUnload: skillDirty,
  });
  const atoms = useDashboardAtoms();
  const key = { organization, app: appId };
  const inventory = useStartedQuery({
    source: claims.wrap(atoms.inventory),
    handle: reads.inventory,
  });
  const query = useStartedQuery({ source: claims.wrap(liveAppAtom(key)), handle: reads.record });
  const app = Option.isSome(query.data)
    ? query.data.value
    : Option.isSome(inventory.data)
      ? inventory.data.value.apps.find((item) => item.id === appId)
      : undefined;
  const selectedView = view ?? (tool === undefined ? "overview" : "tools");
  const appLinks = useStartedQuery({
    source: claims.wrap(appLinksAtom(key)),
    handle: reads.appLinks,
  });
  const userLinks = useStartedQuery({
    source: claims.wrap(userLinksAtom(key)),
    handle: reads.userLinks,
  });
  const session = useStartedQuery({ source: claims.wrap(sessionAtom), handle: reads.session });
  const userId = AsyncResult.isSuccess(session.result) ? session.result.value?.user.id : undefined;
  const authority = useStartedQuery({
    source: claims.wrap(appAccessAtom(key)),
    handle: reads.access,
  });
  const activeVersion = app?.activeVersion;
  useEffect(() => {
    if (version !== undefined || activeVersion == null) return;
    void navigate({
      to: "/org/$organizationSlug/apps/$appId",
      params: { organizationSlug, appId },
      search: { view, tool, version: activeVersion },
      replace: true,
    });
  }, [activeVersion, appId, navigate, organizationSlug, tool, version, view]);
  const access = Option.getOrUndefined(authority.data);
  const canManage = access?.canManage === true,
    canUse = access?.canUse === true;
  const accessPendingReason = AsyncResult.isFailure(authority.result)
    ? "App access could not be checked. Retry the access request."
    : "Checking app access…";
  const manageReason =
    access === undefined
      ? accessPendingReason
      : canManage
        ? undefined
        : "Only the app creator and organization admins can manage this app.";
  const sourceReason =
    access === undefined
      ? accessPendingReason
      : canManage
        ? undefined
        : "Only the app creator and organization admins can view app source and versions.";
  const missing = (forEveryone: boolean) => (
    <div className="space-y-3 p-5 text-sm text-muted-foreground">
      <p>
        {!forEveryone
          ? "Link an account in Accounts to start using this app."
          : canManage
            ? "This app needs an account linked for everyone. Link one under App accounts in Accounts."
            : "This app needs an account linked for everyone. Ask someone who can edit this app to link one."}
      </p>
      <Button variant="outline" size="sm" asChild>
        <Link
          to="/org/$organizationSlug/apps/$appId"
          params={{ organizationSlug, appId }}
          search={{ view: "accounts" }}
        >
          Go to Accounts
        </Link>
      </Button>
    </div>
  );
  const pending = <AppDetailLoading view={selectedView} app={app} selectedTool={tool} />;
  return (
    <AppDetailLayout
      key={appId}
      app={app}
      view={selectedView}
      canInspectSource={canManage}
      sourceDisabledReason={sourceReason}
      back={
        <Link
          to="/org/$organizationSlug/apps"
          params={{ organizationSlug }}
          aria-label="Back to apps"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} size={15} aria-hidden />
          Apps
        </Link>
      }
      actions={
        app === undefined || access === undefined ? (
          <Skeleton className="h-9 w-28 max-[740px]:h-11" />
        ) : (
          <>
            {canUse && openApp?.(app)}
            {canManage && (role === "owner" || role === "admin") ? (
              <PublishApp app={app} atoms={appManagement(organization)} Failure={HostedFailure} />
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabledReason={
                  role === undefined
                    ? "Checking organization access…"
                    : role === "owner" || role === "admin"
                      ? manageReason
                      : "Only organization owners and admins can publish apps."
                }
              >
                Publish
              </Button>
            )}
          </>
        )
      }
    >
      {appWideViews.has(selectedView) || !canUse ? (
        <QueryResult
          result={allResults({ access: authority.result, current: query.result })}
          Failure={HostedFailure}
          retry={() => {
            authority.refresh();
            query.refresh();
          }}
          pending={pending}
        >
          {({ current }) => {
            if (selectedView === "settings")
              return (
                <AppSettings
                  app={current}
                  copyAction={
                    canManage ? (
                      <CopyApp
                        key={current.id}
                        Failure={HostedFailure}
                        app={current}
                        atoms={appManagement(organization)}
                        onApp={(get, saved) => acknowledgeApp(get, organization, saved)}
                        onCopied={(copy) =>
                          navigate({
                            to: "/org/$organizationSlug/apps/$appId",
                            params: { organizationSlug, appId: copy.id },
                            search: { view: "source" },
                          })
                        }
                      />
                    ) : (
                      <Button variant="outline" size="sm" disabledReason={manageReason}>
                        Make a copy
                      </Button>
                    )
                  }
                  renameAction={
                    canManage ? (
                      <AppRename app={current} />
                    ) : (
                      <Button variant="outline" size="sm" disabledReason={manageReason}>
                        Rename
                      </Button>
                    )
                  }
                  deleteAction={
                    canManage ? (
                      <DeleteApp app={current} />
                    ) : (
                      <Button variant="destructive" size="sm" disabledReason={manageReason}>
                        Delete app
                      </Button>
                    )
                  }
                >
                  <section className="rounded-lg border p-5">
                    <AppAccessSettings
                      app={current.id}
                      userId={userId}
                      access={reads.access}
                      groups={reads.groups}
                    />
                  </section>
                </AppSettings>
              );
            if (
              selectedView === "source" ||
              selectedView === "history" ||
              selectedView === "versions"
            )
              return !canManage ? (
                <p className="p-5 text-sm text-muted-foreground">
                  The app creator and organization admins can inspect app source.
                </p>
              ) : selectedView === "versions" ? (
                <AppVersions
                  key={current.id}
                  app={current}
                  version={version ?? reads.version}
                  versions={reads.versions}
                  source={reads.source}
                  onVersionChange={(next) => {
                    void navigate({
                      to: "/org/$organizationSlug/apps/$appId",
                      params: { organizationSlug, appId },
                      search: { view: "versions", tool, version: next },
                      replace: true,
                    });
                  }}
                />
              ) : reads.working === undefined || reads.history === undefined ? (
                pending
              ) : (
                <AppSource
                  key={current.id}
                  app={current}
                  view={selectedView}
                  working={reads.working}
                  history={reads.history}
                  {...(reads.live === undefined || reads.liveVersion === undefined
                    ? {}
                    : { live: reads.live, liveVersion: reads.liveVersion })}
                />
              );
            return (
              <p className="p-5 text-sm text-muted-foreground">
                This app is not shared with you. You can manage its settings.
              </p>
            );
          }}
        </QueryResult>
      ) : (
        <QueryResult
          result={allResults({
            access: authority.result,
            current: query.result,
            inventory: inventory.result,
            appRows: appLinks.result,
            userRows: userLinks.result,
          })}
          Failure={HostedFailure}
          retry={() => {
            authority.refresh();
            query.refresh();
            inventory.refresh();
            appLinks.refresh();
            userLinks.refresh();
          }}
          pending={pending}
        >
          {({ current, inventory, appRows, userRows }) => {
            const linked = {
              app: withSummaries(appRows, inventory.accounts),
              user: withSummaries(userRows, inventory.accounts),
            };
            const requirements = requirementAccounts(current, linked);
            const ready = missingRequirements(requirements).length === 0;
            const version = current.activeVersion ?? undefined;
            const gate = (children: ReactNode) =>
              ready
                ? children
                : missing(
                    missingRequirements(requirements).some(
                      (entry) => entry.requirement.scope === "app",
                    ),
                  );
            if (selectedView === "skills")
              return gate(
                <AppSkills
                  canEdit={canManage}
                  app={current}
                  bindings={appBrowserBindings(organization, current)}
                  Failure={HostedFailure}
                  editing={
                    canManage
                      ? {
                          atoms: appManagement(organization),
                          onDirty: setSkillDirty,
                          onApp: (get, saved) => acknowledgeApp(get, organization, saved),
                        }
                      : undefined
                  }
                />,
              );
            if (selectedView === "tools") {
              const selectedVersion = version ?? reads.version;
              return gate(
                reads.tools === undefined || selectedVersion === undefined ? (
                  pending
                ) : (
                  <AppTools
                    app={current}
                    version={selectedVersion}
                    tools={reads.tools}
                    detail={reads.detail}
                    requirements={requirements}
                    selected={tool}
                  />
                ),
              );
            }
            if (selectedView === "workflows")
              return gate(<AppResources app={current} view="workflows" />);
            if (selectedView === "webhooks") return <AppResources app={current} view="webhooks" />;
            if (selectedView === "schedules") {
              return userId === undefined ? (
                <AppSchedulesLoading />
              ) : (
                <AppSchedules
                  app={current}
                  canEdit={canManage}
                  actor={userId}
                  bindings={scheduleBindings({ organization, app: current.id }, true, canManage)}
                  Failure={HostedFailure}
                />
              );
            }
            const previewEmpty = (
              <p className="py-5 text-sm text-muted-foreground">
                Link an account in Accounts to load this preview.
              </p>
            );
            if (selectedView === "overview")
              return (
                <AppOverview
                  app={current}
                  entries={
                    <AppOverviewEntries
                      app={current}
                      bindings={appBrowserBindings(organization, current)}
                      workflows={
                        <AppWorkflowPreview
                          empty={previewEmpty}
                          Failure={HostedFailure}
                          sources={
                            ready
                              ? [
                                  {
                                    key: String(version),
                                    query: appBrowserBindings(organization, current).workflows,
                                  },
                                ]
                              : []
                          }
                        />
                      }
                      Failure={HostedFailure}
                    />
                  }
                  accounts={<AppOverviewAccounts app={current} requirements={requirements} />}
                  tools={
                    <AppOverviewTools
                      app={current}
                      Failure={HostedFailure}
                      empty={previewEmpty}
                      accountsNeeded={
                        emptyManyRequirements(requirements).length === requirements.length &&
                        requirements.length > 0
                      }
                      sources={
                        ready
                          ? [
                              {
                                key: String(version),
                                query: toolsAtom({ organization, app: current.id, version }),
                              },
                            ]
                          : []
                      }
                    />
                  }
                  sourceDisabledReason={sourceReason}
                  source={
                    canManage ? (
                      <QueryView
                        query={appManagement(organization).authoring(current.id)}
                        {...(reads.authoring === undefined
                          ? {}
                          : {
                              read: {
                                source: appManagement(organization).authoring(current.id),
                                handle: reads.authoring,
                              },
                            })}
                        Failure={HostedFailure}
                        pending={<OverviewCardLoading label="Loading source preview" />}
                      >
                        {(source) => <AppOverviewSource source={source} />}
                      </QueryView>
                    ) : (
                      <p className="py-5 text-sm text-muted-foreground">Source is restricted.</p>
                    )
                  }
                />
              );
            return (
              <div className="max-w-3xl space-y-4 p-5 max-[740px]:p-4">
                <AppAccounts
                  app={current}
                  appLinks={linked.app}
                  userLinks={linked.user}
                  canManage={canManage}
                  canUse={canUse}
                  accounts={inventory.accounts}
                  redirectUri={inventory.accountSetup.redirectUri}
                />
              </div>
            );
          }}
        </QueryResult>
      )}
    </AppDetailLayout>
  );
}

function DeleteApp({ app }: { readonly app: App }) {
  const { organization, slug: organizationSlug } = useOrganizationRoute();
  const remove = useAtomSet(removeAppAtom({ organization, app: app.id }), { mode: "promiseExit" });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Delete app
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogTitle>Delete app?</DialogTitle>
        <p className="text-sm font-medium">{app.name}</p>
        <DialogDescription>
          This permanently removes the app and its saved data. Connected accounts and copies
          installed by others are kept.
        </DialogDescription>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            onClick={async () => {
              setPending(true);
              setError(undefined);
              const result = await remove();
              setPending(false);
              if (Exit.isFailure(result)) setError(appError(result.cause));
              else {
                await navigate({ to: "/org/$organizationSlug/apps", params: { organizationSlug } });
              }
            }}
          >
            Delete app
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The mutation acknowledges shared metadata before the dialog closes. */
function AppRename({ app }: { readonly app: App }) {
  const { organization } = useOrganizationRoute();
  const rename = useAtomSet(renameAppAtom({ organization, app: app.id }), { mode: "promiseExit" });
  return <RenameApp<HostedError> app={app} Failure={HostedFailure} rename={rename} />;
}
