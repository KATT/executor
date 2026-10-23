import { EmptyStatePanel } from "@executor-js/ui/dashboard/empty-state";
import { AppWorkspace } from "@executor-js/ui/dashboard/app-workspace";
import { appManagement } from "../../contracts/app-management.ts";
import { acknowledgeApp } from "../../contracts/apps.ts";
import { toolsAtom } from "../../contracts/api.ts";
import { VersionId } from "@executor-js/sdk";
import type { DashboardApp } from "@executor-js/local-server/contracts";
import { useMemo } from "react";
import { sourceAtom, sourceFileAtom } from "../../contracts/api.ts";
import { AppVersions as SharedAppVersions } from "@executor-js/ui/dashboard/app-versions";
import { Failure } from "../components/common.tsx";
import type { LocalAppReads } from "./app-detail.tsx";

/** Inspect immutable source versions; choosing a version never changes the active version. */
export function AppVersions({
  data,
  version,
  source,
  onVersionChange,
}: {
  readonly data: DashboardApp;
  readonly version: VersionId | undefined;
  readonly source: LocalAppReads["source"];
  readonly onVersionChange: (version: VersionId | undefined) => void;
}) {
  const selected = version ?? data.app.activeVersion;
  const query = useMemo(
    () => (selected == null ? undefined : sourceAtom({ app: data.app.id, version: selected })),
    [data.app.id, selected],
  );
  if (selected == null || query === undefined)
    return (
      <EmptyStatePanel title="No versions yet">
        Deploy from Source when you’re ready.
      </EmptyStatePanel>
    );
  return (
    <SharedAppVersions
      app={data.app}
      versions={data.versions}
      version={selected}
      onVersionChange={onVersionChange}
      query={query}
      {...(source === undefined ? {} : { read: { source: query, handle: source } })}
      file={(version, path) => sourceFileAtom({ app: data.app.id, version, path })}
      Failure={Failure}
    />
  );
}

/** Local app source uses shared read-only inspection and the existing live app inventory. */
export function AppSource({
  data,
  view,
  working,
  history,
  live,
  liveVersion,
}: {
  readonly data: DashboardApp;
  readonly view: "source" | "history";
  readonly working: NonNullable<LocalAppReads["working"]>;
  readonly history: NonNullable<LocalAppReads["history"]>;
  readonly live?: NonNullable<LocalAppReads["live"]> | undefined;
  readonly liveVersion?: VersionId | undefined;
}) {
  const shown = appManagement.source(data.app.id);
  const commits = appManagement.history(data.app.id);
  return (
    <AppWorkspace
      Failure={Failure}
      app={data.app}
      atoms={appManagement}
      onApp={(get, app) => {
        acknowledgeApp(get, app);
        get.refresh(toolsAtom({ app: app.id }));
      }}
      view={view}
      sourceRead={{ source: shown, handle: working }}
      historyRead={{ source: commits, handle: history }}
      {...(live === undefined || liveVersion === undefined
        ? {}
        : {
            liveRead: {
              source: sourceAtom({ app: data.app.id, version: liveVersion }),
              handle: live,
            },
          })}
    />
  );
}
