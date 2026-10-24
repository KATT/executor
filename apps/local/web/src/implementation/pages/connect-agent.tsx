import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { AppId, VersionId } from "@executor-js/sdk";
import { AsyncResult } from "effect/reactivity";
import { Loader } from "raf-effect-atom";
import { StartedQueryView } from "@executor-js/ui/dashboard/context";
import { McpInstallInstructions } from "@executor-js/ui/dashboard/connect";
import {
  ScopedConnectionsPage,
  type ScopedConnectionLinkProps,
  type ScopedConnectionScreen,
  type ScopedConnectionTargetLinkProps,
} from "@executor-js/ui/dashboard/scoped-connections";
import { ConnectionToolPicker } from "@executor-js/ui/dashboard/connection-tool-picker";
import { overviewAtom, toolListAtom } from "../../contracts/api.ts";
import { parseConnectSearch } from "../../contracts/navigation.ts";
import { mcpInstallationAtom } from "../../contracts/mcp.ts";
import {
  mcpConnectionsAtom,
  revokeMcpConnectionAtom,
  saveMcpConnectionAtom,
} from "../../contracts/mcp-connections.ts";
import { Failure, LoadingRows } from "../components/common.tsx";
import {
  DataBoundary,
  ForbiddenBoundary,
  LiveBoundary,
  MissingBoundary,
  SessionBoundary,
  StorageBoundary,
  useMissingBoundary,
} from "../components/read-boundaries.tsx";

/** The version the open app's tool list was started with. */
const toolVersion = async (atoms: Loader.Loader, app: AppId, version: VersionId | undefined) => {
  if (version !== undefined) return version;
  const overview = await atoms.ensure(overviewAtom);
  const result = Loader.result(overview);
  if (!AsyncResult.isSuccess(result)) return undefined;
  const active = result.value.apps.find((item) => item.id === app)?.activeVersion;
  return active ?? undefined;
};

/** Start the connect page's reads before the first component renders. */
export async function loadLocalConnect(
  atoms: Loader.Loader,
  search: { readonly app?: AppId | undefined; readonly version?: VersionId | undefined } = {},
) {
  const installation = atoms.prefetch(mcpInstallationAtom);
  const connections = atoms.prefetch(mcpConnectionsAtom);
  const overview = atoms.prefetch(overviewAtom);
  const listed =
    search.app !== undefined && search.version !== undefined
      ? {
          version: search.version,
          handle: atoms.prefetch(toolListAtom({ app: search.app, version: search.version })),
        }
      : undefined;
  const version =
    listed !== undefined || search.app === undefined
      ? undefined
      : await toolVersion(atoms, search.app, undefined);
  return {
    installation,
    connections,
    overview,
    tools:
      listed ??
      (search.app === undefined || version === undefined
        ? undefined
        : {
            version,
            handle: atoms.prefetch(toolListAtom({ app: search.app, version })),
          }),
  };
}

export type LocalConnectReads = Awaited<ReturnType<typeof loadLocalConnect>>;

function ListLink(props: ScopedConnectionLinkProps) {
  return <Link {...props} to="/connect" />;
}

function CreateLink(props: ScopedConnectionLinkProps) {
  return <Link {...props} to="/connect/new" />;
}

function DetailLink({ connection, ...props }: ScopedConnectionTargetLinkProps) {
  return <Link {...props} to="/connect/$connectionId" params={{ connectionId: connection }} />;
}

function EditLink({ connection, ...props }: ScopedConnectionTargetLinkProps) {
  return <Link {...props} to="/connect/$connectionId/edit" params={{ connectionId: connection }} />;
}

/** This instance's full-access URL and the operator's scoped connections. */
export function ConnectAgentPage({
  screen = { kind: "list" },
  reads,
}: {
  readonly screen?: ScopedConnectionScreen;
  readonly reads: LocalConnectReads;
}) {
  return (
    <SessionBoundary>
      <ForbiddenBoundary>
        <StorageBoundary>
          <DataBoundary>
            <LiveBoundary>
              <MissingBoundary>
                <ConnectAgent screen={screen} reads={reads} />
              </MissingBoundary>
            </LiveBoundary>
          </DataBoundary>
        </StorageBoundary>
      </ForbiddenBoundary>
    </SessionBoundary>
  );
}

function ConnectAgent({
  screen,
  reads,
}: {
  readonly screen: ScopedConnectionScreen;
  readonly reads: LocalConnectReads;
}) {
  const navigate = useNavigate();
  const search = parseConnectSearch(useLocation().search);
  const installation = {
    source: mcpInstallationAtom,
    handle: reads.installation,
    claim: useMissingBoundary,
  };
  const toolRead =
    reads.tools === undefined || search.app === undefined
      ? undefined
      : {
          source: toolListAtom({ app: search.app, version: reads.tools.version }),
          handle: reads.tools.handle,
          claim: useMissingBoundary,
        };
  return (
    <ScopedConnectionsPage
      screen={screen}
      links={{ ListLink, CreateLink, DetailLink, EditLink }}
      onSaved={(saved) => {
        void navigate({
          to: "/connect/$connectionId",
          params: { connectionId: saved.id },
          replace: true,
        });
      }}
      onRevoked={() => {
        void navigate({ to: "/connect", replace: true });
      }}
      query={{ source: overviewAtom, handle: reads.overview, claim: useMissingBoundary }}
      connections={{
        source: mcpConnectionsAtom,
        handle: reads.connections,
        claim: useMissingBoundary,
      }}
      save={saveMcpConnectionAtom}
      revoke={revokeMcpConnectionAtom}
      Failure={Failure}
      toolsApp={search.app}
      onToolsApp={(next) => {
        void navigate({
          to: ".",
          search: (previous) => ({
            ...previous,
            app: next?.id,
            version: next?.version ?? undefined,
          }),
          replace: true,
        });
      }}
      renderTools={({ app, names, onChange }) =>
        toolRead === undefined ? (
          <p className="px-4 py-6 text-xs text-muted-foreground">
            Deploy this app to choose its tools.
          </p>
        ) : (
          <ConnectionToolPicker
            query={toolListAtom({ app: app.id, version: app.activeVersion })}
            read={toolRead}
            Failure={Failure}
            names={names}
            onChange={onChange}
          />
        )
      }
      installation={
        <StartedQueryView
          source={installation.source}
          handle={installation.handle}
          claim={installation.claim}
          Failure={Failure}
          pending={<LoadingRows count={3} />}
        >
          {(data) => (
            <McpInstallInstructions endpoint={data.endpoint}>
              Keep the local server running while your agent uses Executor.
            </McpInstallInstructions>
          )}
        </StartedQueryView>
      }
    />
  );
}
