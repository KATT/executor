import { Link, useNavigate } from "@tanstack/react-router";
import type { Loader } from "raf-effect-atom";
import { StartedQueryView } from "@executor-js/ui/dashboard/context";
import { started } from "@executor-js/ui/contracts/started-read";
import { McpInstallInstructions } from "@executor-js/ui/dashboard/connect";
import {
  ScopedConnectionsPage,
  type ScopedConnectionLinkProps,
  type ScopedConnectionScreen,
  type ScopedConnectionTargetLinkProps,
} from "@executor-js/ui/dashboard/scoped-connections";
import { ConnectionToolPicker } from "@executor-js/ui/dashboard/connection-tool-picker";
import { overviewAtom, overviewSnapshotAtom, toolListAtom } from "../../contracts/api.ts";
import { prefetchLiveSnapshot } from "../../contracts/live-prefetch.ts";
import { mcpInstallationAtom } from "../../contracts/mcp.ts";
import {
  mcpConnectionsAtom,
  mcpConnectionsQuery,
  revokeMcpConnectionAtom,
  saveMcpConnectionAtom,
} from "../../contracts/mcp-connections.ts";
import { Failure, LoadingRows } from "../components/common.tsx";
import {
  ForbiddenBoundary,
  SessionBoundary,
  StorageBoundary,
  useStorageBoundary,
} from "../components/read-boundaries.tsx";

/** Start the connect page's reads together, before the first component renders. */
export function loadLocalConnect(atoms: Loader.Loader) {
  return {
    installation: atoms.prefetch(mcpInstallationAtom),
    connections: atoms.prefetch(mcpConnectionsQuery),
    overview: prefetchLiveSnapshot(atoms, overviewSnapshotAtom),
  };
}

export type LocalConnectReads = ReturnType<typeof loadLocalConnect>;

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
          <ConnectAgent screen={screen} reads={reads} />
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
  const claims = useStorageBoundary();
  const installation = started(claims.wrap(mcpInstallationAtom), reads.installation);
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
      query={started(claims.wrap(overviewAtom), reads.overview)}
      connections={started(claims.wrap(mcpConnectionsAtom), reads.connections)}
      save={saveMcpConnectionAtom}
      revoke={revokeMcpConnectionAtom}
      Failure={Failure}
      renderTools={({ app, names, onChange }) => (
        // TODO(raf-effect-atom gap: Loader verbs die on derived atoms instead of following initialValueTarget)
        // TODO(raf-effect-atom gap: Tool list state is not a URL the loader can prefetch)
        <ConnectionToolPicker
          query={toolListAtom({
            app: app.id,
            version: app.activeVersion,
          })}
          Failure={Failure}
          names={names}
          onChange={onChange}
        />
      )}
      installation={
        <StartedQueryView
          source={installation.source}
          handle={installation.handle}
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
