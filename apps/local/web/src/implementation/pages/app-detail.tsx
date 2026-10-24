import { AppResources } from "./app-resources.tsx";
import { useEffect, useState, type ReactNode } from "react";
import { Loader } from "raf-effect-atom";
import { AppAccounts } from "./app-accounts.tsx";
import { AppSkills } from "@executor-js/ui/dashboard/app-skills";
import {
  AppOverviewEntries,
  AppWorkflowPreview,
} from "@executor-js/ui/dashboard/app-overview-entries";
import { appBrowserBindings } from "../../contracts/app-browser.ts";
import { AppSchedules } from "@executor-js/ui/dashboard/schedules";
import { scheduleBindings } from "../../contracts/schedules.ts";
import { webhookBindings, workflowBindings } from "../../contracts/resources.ts";
import {
  allResults,
  QueryResult,
  QueryView,
  useClaimedResult,
  useStartedQuery,
} from "@executor-js/ui/dashboard/context";
import {
  missingRequirements,
  requirementAccounts,
  type RequirementLink,
} from "@executor-js/ui/contracts/app-accounts";
import { useAtomSet } from "@effect/atom-react";
import { ToolName, type App, type AppId, type VersionId } from "@executor-js/sdk";
import type {
  AppAccountLink,
  DashboardAccount,
  DashboardOverview,
} from "@executor-js/local-server/contracts";
import { Atom, AsyncResult } from "effect/reactivity";
import { Data, Option, Schema } from "effect";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import {
  appAtom,
  sourceAtom,
  toolCatalogAtom,
  toolDetailAtom,
  toolsAtom,
} from "../../contracts/api.ts";
import { appLinksAtom, userLinksAtom } from "../../contracts/app-accounts.ts";
import { renameAppAtom, acknowledgeApp } from "../../contracts/apps.ts";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { Failure } from "../components/common.tsx";
import { Button } from "@executor-js/ui/components/button";
import type { DashboardError } from "../../contracts/errors.ts";
import { RenameApp } from "@executor-js/ui/dashboard/rename-app";
import { CopyApp } from "@executor-js/ui/dashboard/copy-app";
import { AppSettings } from "@executor-js/ui/dashboard/app-settings";
import { AppDetailLayout } from "@executor-js/ui/dashboard/app-detail";
import { AppTools } from "./app-tools.tsx";
import { useMissingBoundary } from "../components/read-boundaries.tsx";
import { AppSource, AppVersions } from "./app-source.tsx";
import {
  AppOverview,
  AppOverviewAccounts,
  AppOverviewTools,
  AppOverviewSource,
} from "@executor-js/ui/dashboard/app-overview";
import { appManagement } from "../../contracts/app-management.ts";
import { AppDetailLoading, OverviewCardLoading } from "@executor-js/ui/dashboard/app-loading";
import { emptyManyRequirements, type AppView } from "@executor-js/ui/contracts/dashboard";
class PreviewKey extends Data.Class<{
  readonly app: AppId;
  readonly version: App["activeVersion"];
}> {}
const overviewToolsAtom = Atom.family((key: PreviewKey) => {
  const query = toolsAtom(key);
  // Point at the serializable catalog so the loader can start this preview.
  return Object.assign(
    Atom.map(
      query,
      AsyncResult.map((data) => ({ items: data.tools })),
    ),
    { initialValueTarget: query },
  );
});

/** The version this page's tools and source were started with. */
const listedVersion = async (atoms: Loader.Loader, app: AppId, version: VersionId | undefined) => {
  if (version !== undefined) return version;
  const loaded = await atoms.ensure(appAtom(app));
  const result = Loader.result(loaded);
  if (!AsyncResult.isSuccess(result) || result.value.app.activeVersion == null) return undefined;
  return result.value.app.activeVersion;
};

/** Start the app page's reads from the URL before the first component renders. */
export async function loadLocalApp(
  atoms: Loader.Loader,
  app: AppId,
  search: {
    readonly version?: VersionId | undefined;
    readonly tool?: string | undefined;
    readonly view?: AppView | undefined;
  },
) {
  const record = atoms.prefetch(appAtom(app));
  const appLinks = atoms.prefetch(appLinksAtom(app));
  const userLinks = atoms.prefetch(userLinksAtom(app));
  const shown = search.view ?? (search.tool === undefined ? "overview" : "tools");
  const inspecting = shown === "source" || shown === "history";
  const workspace = inspecting
    ? {
        working: atoms.prefetch(appManagement.source(app)),
        history: atoms.prefetch(appManagement.history(app)),
      }
    : { working: undefined, history: undefined };
  const authoring = shown === "overview" ? atoms.prefetch(appManagement.authoring(app)) : undefined;
  const known = search.version;
  const tool =
    search.tool === undefined
      ? undefined
      : Option.getOrUndefined(Schema.decodeUnknownOption(ToolName)(search.tool));
  const detailFor = (version: VersionId) =>
    tool === undefined ? undefined : atoms.prefetch(toolDetailAtom({ app, version, tool }));
  const listed =
    known === undefined
      ? undefined
      : {
          version: known,
          tools: atoms.prefetch(toolCatalogAtom({ app, version: known })),
          source: atoms.prefetch(sourceAtom({ app, version: known })),
          detail: detailFor(known),
        };
  const needsActive =
    known === undefined ||
    inspecting ||
    shown === "overview" ||
    shown === "skills" ||
    shown === "workflows";
  const active = needsActive ? await listedVersion(atoms, app, undefined) : undefined;
  const version = known ?? active;
  const liveVersion = inspecting ? active : undefined;
  const browser =
    active === undefined ? undefined : appBrowserBindings({ id: app, activeVersion: active });
  const flows = workflowBindings({ app, version: active });
  const hooks = webhookBindings({ app });
  const schedules = scheduleBindings({ app });
  return {
    app: record,
    appLinks,
    userLinks,
    ...workspace,
    authoring,
    skillBundle:
      shown === "skills" && browser !== undefined ? atoms.prefetch(browser.bundle) : undefined,
    skillWorkspace: shown === "skills" ? atoms.prefetch(appManagement.workspace(app)) : undefined,
    skillList:
      shown === "overview" && browser !== undefined ? atoms.prefetch(browser.skills) : undefined,
    workflowList:
      (shown === "overview" || shown === "workflows") && active !== undefined
        ? atoms.prefetch(flows.workflows)
        : undefined,
    workflowRuns:
      shown === "workflows" ? atoms.prefetch(flows.runs(undefined, undefined)) : undefined,
    overviewTools:
      shown === "overview" && active !== undefined
        ? atoms.prefetch(overviewToolsAtom(new PreviewKey({ app, version: active })))
        : undefined,
    scheduleSettings: shown === "schedules" ? atoms.prefetch(schedules.settings) : undefined,
    scheduleDefinitions: shown === "schedules" ? atoms.prefetch(schedules.definitions) : undefined,
    webhooks: shown === "webhooks" ? atoms.prefetch(hooks.query) : undefined,
    webhookSources: shown === "webhooks" ? atoms.prefetch(hooks.sources) : undefined,
    live:
      liveVersion === undefined
        ? undefined
        : atoms.prefetch(sourceAtom({ app, version: liveVersion })),
    liveVersion,
    version,
    tools:
      listed?.tools ??
      (version === undefined ? undefined : atoms.prefetch(toolCatalogAtom({ app, version }))),
    source:
      listed?.source ??
      (version === undefined ? undefined : atoms.prefetch(sourceAtom({ app, version }))),
    detail: listed?.detail ?? (version === undefined ? undefined : detailFor(version)),
  };
}

export type LocalAppReads = Awaited<ReturnType<typeof loadLocalApp>>;

/** Views that read only the app. The others also read its linked accounts. */
const appWideViews: ReadonlySet<AppView> = new Set(["settings", "versions", "source", "history"]);

/** Links with their checks by this app, over the live inventory's sign-in details. */
const withSummaries = (
  links: readonly AppAccountLink[],
  accounts: readonly DashboardAccount[],
): readonly RequirementLink<DashboardAccount>[] =>
  links.flatMap((link) => {
    const summary = accounts.find((item) => item.id === link.account.id);
    return summary === undefined
      ? []
      : [
          {
            requirement: link.requirement,
            account: link.health === undefined ? summary : { ...summary, health: link.health },
          },
        ];
  });

/** Views that run app code use the accounts linked to the app. */
export function AppDetailPage({
  id,
  tab,
  tool,
  version,
  reads,
  overview,
}: {
  readonly id: AppId;
  readonly tab: AppView;
  readonly tool: string | undefined;
  readonly version: VersionId | undefined;
  readonly reads: LocalAppReads;
  readonly overview: DashboardOverview;
}) {
  const navigate = useNavigate();
  const [skillDirty, setSkillDirty] = useState(false);
  useBlocker({
    shouldBlockFn: () => skillDirty && !window.confirm("Discard your unsaved changes?"),
    enableBeforeUnload: skillDirty,
  });
  const queryState = useStartedQuery({ source: appAtom(id), handle: reads.app });
  const queryResult = useClaimedResult(appAtom(id), queryState.result, useMissingBoundary);
  const query = {
    result: queryResult,
    data: AsyncResult.value(queryResult),
    refresh: queryState.refresh,
  };
  const appLinksState = useStartedQuery({
    source: appLinksAtom(id),
    handle: reads.appLinks,
  });
  const appLinksResult = useClaimedResult(
    appLinksAtom(id),
    appLinksState.result,
    useMissingBoundary,
  );
  const appLinks = {
    result: appLinksResult,
    data: AsyncResult.value(appLinksResult),
    refresh: appLinksState.refresh,
  };
  const userLinksState = useStartedQuery({
    source: userLinksAtom(id),
    handle: reads.userLinks,
  });
  const userLinksResult = useClaimedResult(
    userLinksAtom(id),
    userLinksState.result,
    useMissingBoundary,
  );
  const userLinks = {
    result: userLinksResult,
    data: AsyncResult.value(userLinksResult),
    refresh: userLinksState.refresh,
  };
  const app = Option.isSome(query.data)
    ? query.data.value.app
    : overview.apps.find((item) => item.id === id);
  const activeVersion = app?.activeVersion;
  useEffect(() => {
    if (version !== undefined || activeVersion == null) return;
    void navigate({
      to: "/apps/$appId",
      params: { appId: id },
      search: (previous) => ({ ...previous, version: activeVersion }),
      replace: true,
    });
  }, [activeVersion, id, navigate, version]);
  const missing = (forEveryone: boolean) => (
    <div className="space-y-3 p-5 text-sm text-muted-foreground">
      <p>
        {forEveryone
          ? "This app needs an account linked for everyone. Link one under App accounts in Accounts."
          : "Connect an account in Accounts to start using this app."}
      </p>
      <Button variant="outline" size="sm" asChild>
        <Link to="/apps/$appId" params={{ appId: id }} search={{ view: "accounts" }}>
          Go to Accounts
        </Link>
      </Button>
    </div>
  );
  const pending = <AppDetailLoading view={tab} app={app} selectedTool={tool} />;
  return (
    <AppDetailLayout
      key={id}
      app={app}
      view={tab}
      canInspectSource
      back={
        <Link to="/apps" aria-label="Back to apps">
          <HugeiconsIcon icon={ArrowLeft02Icon} size={15} aria-hidden />
          Apps
        </Link>
      }
      actions={
        Option.isSome(query.data) &&
        query.data.value.uiUrl !== null && (
          <Button variant="outline" asChild>
            <a href={query.data.value.uiUrl} target="_blank" rel="noopener noreferrer">
              Open app{" "}
              <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} aria-hidden size={14} />
            </a>
          </Button>
        )
      }
    >
      {appWideViews.has(tab) ? (
        <QueryResult
          result={query.result}
          Failure={Failure}
          retry={query.refresh}
          pending={pending}
        >
          {(current) => {
            if (tab === "settings")
              return (
                <AppSettings
                  app={current.app}
                  copyAction={
                    <CopyApp
                      key={current.app.id}
                      Failure={Failure}
                      app={current.app}
                      atoms={appManagement}
                      onApp={acknowledgeApp}
                      onCopied={(copy) =>
                        navigate({
                          to: "/apps/$appId",
                          params: { appId: copy.id },
                          search: { view: "source" },
                        })
                      }
                    />
                  }
                  renameAction={current.canDelete && <AppRename app={current.app} />}
                  deleteAction={
                    current.canDelete && (
                      <Button variant="destructive" size="sm" asChild>
                        <Link to="/apps/$appId/delete" params={{ appId: id }}>
                          Delete app
                        </Link>
                      </Button>
                    )
                  }
                  notice={
                    !current.canDelete &&
                    "This app is managed by Executor and cannot be renamed or deleted."
                  }
                />
              );
            if (tab === "versions")
              return (
                <AppVersions
                  data={current}
                  version={version ?? current.app.activeVersion ?? undefined}
                  source={reads.source}
                  onVersionChange={(next) => {
                    void navigate({
                      to: "/apps/$appId",
                      params: { appId: id },
                      search: (previous) => ({ ...previous, view: "versions", version: next }),
                      replace: true,
                    });
                  }}
                />
              );
            return reads.working === undefined || reads.history === undefined ? (
              pending
            ) : (
              <AppSource
                data={current}
                view={tab === "history" ? "history" : "source"}
                working={reads.working}
                history={reads.history}
                {...(reads.live === undefined || reads.liveVersion === undefined
                  ? {}
                  : { live: reads.live, liveVersion: reads.liveVersion })}
              />
            );
          }}
        </QueryResult>
      ) : (
        <QueryResult
          result={allResults({
            current: query.result,
            appRows: appLinks.result,
            userRows: userLinks.result,
          })}
          Failure={Failure}
          retry={() => {
            query.refresh();
            appLinks.refresh();
            userLinks.refresh();
          }}
          pending={pending}
        >
          {({ current, appRows, userRows }) => {
            const linked = {
              app: withSummaries(appRows, overview.accounts),
              user: withSummaries(userRows, overview.accounts),
            };
            const requirements = requirementAccounts(current.app, linked);
            const versionKey = String(current.app.activeVersion);
            const ready = missingRequirements(requirements).length === 0;
            const gate = (children: ReactNode) =>
              ready
                ? children
                : missing(
                    missingRequirements(requirements).some(
                      (entry) => entry.requirement.scope === "app",
                    ),
                  );
            if (tab === "skills") {
              const browser = appBrowserBindings(current.app);
              return gate(
                <AppSkills
                  canEdit
                  app={current.app}
                  bindings={browser}
                  Failure={Failure}
                  editing={{
                    atoms: appManagement,
                    onApp: acknowledgeApp,
                    onDirty: setSkillDirty,
                  }}
                  {...(reads.skillWorkspace === undefined
                    ? {}
                    : {
                        workspaceRead: {
                          source: appManagement.workspace(current.app.id),
                          handle: reads.skillWorkspace,
                        },
                      })}
                  {...(reads.skillBundle === undefined
                    ? {}
                    : { bundleRead: { source: browser.bundle, handle: reads.skillBundle } })}
                />,
              );
            }
            if (tab === "tools") {
              const selectedVersion = version ?? reads.version;
              return gate(
                reads.tools === undefined || selectedVersion === undefined ? (
                  pending
                ) : (
                  <AppTools
                    app={current.app}
                    version={selectedVersion}
                    tools={reads.tools}
                    detail={reads.detail}
                    requirements={requirements}
                    selected={tool}
                  />
                ),
              );
            }
            if (tab === "workflows") {
              const flows = workflowBindings({
                app: current.app.id,
                version: current.app.activeVersion ?? undefined,
              });
              return gate(
                <AppResources
                  app={current.app}
                  view="workflows"
                  {...(reads.workflowList === undefined
                    ? {}
                    : { definitions: { source: flows.workflows, handle: reads.workflowList } })}
                  {...(reads.workflowRuns === undefined
                    ? {}
                    : {
                        runs: {
                          source: flows.runs(undefined, undefined),
                          handle: reads.workflowRuns,
                        },
                      })}
                />,
              );
            }
            if (tab === "webhooks") {
              const hooks = webhookBindings({ app: current.app.id });
              return (
                <AppResources
                  app={current.app}
                  view="webhooks"
                  {...(reads.webhooks === undefined
                    ? {}
                    : { webhooks: { source: hooks.query, handle: reads.webhooks } })}
                  {...(reads.webhookSources === undefined
                    ? {}
                    : {
                        webhookSources: { source: hooks.sources, handle: reads.webhookSources },
                      })}
                />
              );
            }
            if (tab === "schedules") {
              const schedules = scheduleBindings({ app: current.app.id });
              return (
                <AppSchedules
                  app={current.app}
                  canEdit
                  actor={undefined}
                  bindings={schedules}
                  Failure={Failure}
                  {...(reads.scheduleSettings === undefined
                    ? {}
                    : {
                        settingsRead: {
                          source: schedules.settings,
                          handle: reads.scheduleSettings,
                        },
                      })}
                  {...(reads.scheduleDefinitions === undefined
                    ? {}
                    : {
                        definitionsRead: {
                          source: schedules.definitions,
                          handle: reads.scheduleDefinitions,
                        },
                      })}
                />
              );
            }
            const previewEmpty = (
              <p className="py-5 text-sm text-muted-foreground">
                Connect an account in Accounts to load this preview.
              </p>
            );
            if (tab === "overview") {
              const browser = appBrowserBindings(current.app);
              const listedTools = overviewToolsAtom(
                new PreviewKey({ app: id, version: current.app.activeVersion }),
              );
              return (
                <AppOverview
                  app={current.app}
                  entries={
                    <AppOverviewEntries
                      app={current.app}
                      bindings={browser}
                      {...(reads.skillList === undefined
                        ? {}
                        : { skillsRead: { source: browser.skills, handle: reads.skillList } })}
                      workflows={
                        <AppWorkflowPreview
                          empty={previewEmpty}
                          Failure={Failure}
                          sources={ready ? [{ key: versionKey, query: browser.workflows }] : []}
                          {...(reads.workflowList === undefined
                            ? {}
                            : { read: { source: browser.workflows, handle: reads.workflowList } })}
                        />
                      }
                      Failure={Failure}
                    />
                  }
                  accounts={<AppOverviewAccounts app={current.app} requirements={requirements} />}
                  tools={
                    <AppOverviewTools
                      app={current.app}
                      Failure={Failure}
                      empty={previewEmpty}
                      accountsNeeded={
                        emptyManyRequirements(requirements).length === requirements.length &&
                        requirements.length > 0
                      }
                      sources={ready ? [{ key: versionKey, query: listedTools }] : []}
                      {...(reads.overviewTools === undefined
                        ? {}
                        : { read: { source: listedTools, handle: reads.overviewTools } })}
                    />
                  }
                  source={
                    <QueryView
                      query={appManagement.authoring(id)}
                      {...(reads.authoring === undefined
                        ? {}
                        : {
                            read: {
                              source: appManagement.authoring(id),
                              handle: reads.authoring,
                            },
                          })}
                      Failure={Failure}
                      pending={<OverviewCardLoading label="Loading source preview" />}
                    >
                      {(source) => <AppOverviewSource source={source} />}
                    </QueryView>
                  }
                />
              );
            }
            return (
              <div className="max-w-3xl space-y-4 p-5 max-[740px]:p-4">
                <AppAccounts
                  app={current.app}
                  appLinks={linked.app}
                  userLinks={linked.user}
                  accounts={overview.accounts}
                />
              </div>
            );
          }}
        </QueryResult>
      )}
    </AppDetailLayout>
  );
}

/** Local reads update through their existing storage subscriptions. */
function AppRename({ app }: { readonly app: App }) {
  const rename = useAtomSet(renameAppAtom(app.id), { mode: "promiseExit" });
  return <RenameApp<DashboardError> app={app} Failure={Failure} rename={(name) => rename(name)} />;
}
