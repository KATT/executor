import { EmptyStatePanel } from "@executor-js/ui/dashboard/empty-state";
import { AppVersionsLoading } from "@executor-js/ui/dashboard/app-loading";
import { AppWorkspace } from "@executor-js/ui/dashboard/app-workspace";
import { appManagement } from "../../contracts/app-management.ts";
import { acknowledgeApp, toolsAtom } from "../../contracts/apps.ts";
import { RegistryContext, useAtomSet } from "@effect/atom-react";
import { useAtomResult } from "raf-effect-atom";
import type { App, VersionId } from "@executor-js/sdk";
import { AppVersions as SharedAppVersions } from "@executor-js/ui/dashboard/app-versions";
import { QueryView } from "@executor-js/ui/dashboard/context";
import { Button } from "@executor-js/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@executor-js/ui/components/dialog";
import { Exit, type Cause } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useContext, useState } from "react";
import {
  activateAppAtom,
  appAtom,
  versionsAtom,
  sourceAtom,
  sourceFileAtom,
} from "../../contracts/apps.ts";
import type { HostedError } from "../../contracts/errors.ts";
import { HostedFailure } from "../components/dashboard-bindings.tsx";
import { useOrganizationRoute } from "../components/organization.tsx";
import type { HostedAppReads } from "./app-detail.tsx";

/** Hosts own reads and activation authority; source browsing shares the local presentation. */
export function AppVersions({
  app,
  version,
  versions,
  source,
  onVersionChange,
}: {
  readonly app: App;
  readonly version: VersionId | undefined;
  readonly versions: HostedAppReads["versions"];
  readonly source: HostedAppReads["source"];
  readonly onVersionChange: (version: VersionId | undefined) => void;
}) {
  const { organization } = useOrganizationRoute();
  const shown = version ?? app.activeVersion;
  if (shown == null)
    return (
      <EmptyStatePanel title="No versions yet">
        Deploy from Source when you’re ready.
      </EmptyStatePanel>
    );
  const listed = versionsAtom({ organization, app: app.id });
  const current = sourceAtom({ organization, app: app.id, version: shown });
  return (
    <QueryView
      query={listed}
      read={{ source: listed, handle: versions }}
      Failure={HostedFailure}
      pending={<AppVersionsLoading />}
    >
      {(items) => (
        <SharedAppVersions
          app={app}
          versions={items}
          version={shown}
          onVersionChange={onVersionChange}
          query={current}
          {...(source === undefined ? {} : { read: { source: current, handle: source } })}
          file={(version, path) => sourceFileAtom({ organization, app: app.id, version, path })}
          Failure={HostedFailure}
          actions={
            shown !== app.activeVersion &&
            source !== undefined && (
              <ActivateVersion
                key={shown}
                app={app}
                version={shown}
                source={{ atom: current, handle: source }}
              />
            )
          }
        />
      )}
    </QueryView>
  );
}

function ActivateVersion({
  app,
  version,
  source,
}: {
  readonly app: App;
  readonly version: VersionId;
  readonly source: {
    readonly atom: ReturnType<typeof sourceAtom>;
    readonly handle: NonNullable<HostedAppReads["source"]>;
  };
}) {
  const { organization } = useOrganizationRoute();
  const registry = useContext(RegistryContext);
  const loaded = useAtomResult(source.atom, source.handle);
  const activate = useAtomSet(activateAppAtom({ organization, app: app.id }), {
    mode: "promiseExit",
  });
  const [expected, setExpected] = useState<VersionId | null>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Cause.Cause<HostedError>>();
  const refresh = () => {
    registry.refresh(appAtom({ organization, app: app.id }));
    registry.refresh(versionsAtom({ organization, app: app.id }));
  };
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={!AsyncResult.isSuccess(loaded)}
        onClick={() => {
          setExpected(app.activeVersion);
          setError(undefined);
        }}
      >
        Activate version
      </Button>
      <Dialog
        open={expected !== undefined}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setExpected(undefined);
            setError(undefined);
          }
        }}
      >
        <DialogContent>
          <DialogTitle>Activate this version?</DialogTitle>
          <DialogDescription>
            New calls will use this code. App data and changes made in other services will not be
            rolled back.
          </DialogDescription>
          {error && (
            <HostedFailure
              cause={error}
              retry={() => {
                refresh();
                setExpected(undefined);
                setError(undefined);
              }}
            />
          )}
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setExpected(undefined)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={async () => {
                if (expected === undefined || pending) return;
                setPending(true);
                setError(undefined);
                const result = await activate({ version, expectedVersion: expected });
                setPending(false);
                if (Exit.isFailure(result)) {
                  setError(result.cause);
                  return;
                }
                setExpected(undefined);
              }}
            >
              Activate version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Source inspection, publication, and version history belong to this app's detail page. */
export function AppSource({
  app,
  view,
  working,
  history,
  live,
  liveVersion,
}: {
  readonly app: App;
  readonly view: "source" | "history";
  readonly working: NonNullable<HostedAppReads["working"]>;
  readonly history: NonNullable<HostedAppReads["history"]>;
  readonly live?: NonNullable<HostedAppReads["live"]> | undefined;
  readonly liveVersion?: VersionId | undefined;
}) {
  const { organization } = useOrganizationRoute();
  const atoms = appManagement(organization);
  const shown = atoms.source(app.id);
  const commits = atoms.history(app.id);
  return (
    <AppWorkspace
      Failure={HostedFailure}
      app={app}
      atoms={atoms}
      onApp={(get, saved) => {
        acknowledgeApp(get, organization, saved);
        get.refresh(versionsAtom({ organization, app: saved.id }));
        get.refresh(toolsAtom({ organization, app: saved.id }));
      }}
      view={view}
      sourceRead={{ source: shown, handle: working }}
      historyRead={{ source: commits, handle: history }}
      {...(live === undefined || liveVersion === undefined
        ? {}
        : {
            liveRead: {
              source: sourceAtom({ organization, app: app.id, version: liveVersion }),
              handle: live,
            },
          })}
    />
  );
}
