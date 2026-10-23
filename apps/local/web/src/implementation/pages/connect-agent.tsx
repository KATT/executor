import { Link, useNavigate } from "@tanstack/react-router";
import { QueryView } from "@executor-js/ui/dashboard/context";
import { McpInstallInstructions } from "@executor-js/ui/dashboard/connect";
import {
  ScopedConnectionsPage,
  type ScopedConnectionLinkProps,
  type ScopedConnectionScreen,
  type ScopedConnectionTargetLinkProps,
} from "@executor-js/ui/dashboard/scoped-connections";
import { ConnectionToolPicker } from "@executor-js/ui/dashboard/connection-tool-picker";
import { overviewAtom, toolListAtom } from "../../contracts/api.ts";
import { mcpInstallationAtom } from "../../contracts/mcp.ts";
import {
  mcpConnectionsAtom,
  revokeMcpConnectionAtom,
  saveMcpConnectionAtom,
} from "../../contracts/mcp-connections.ts";
import { Failure, LoadingRows } from "../components/common.tsx";

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
}: {
  readonly screen?: ScopedConnectionScreen;
}) {
  const navigate = useNavigate();
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
      query={overviewAtom}
      connections={mcpConnectionsAtom}
      save={saveMcpConnectionAtom}
      revoke={revokeMcpConnectionAtom}
      Failure={Failure}
      renderTools={({ app, names, onChange }) => (
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
        <QueryView
          query={mcpInstallationAtom}
          Failure={Failure}
          pending={<LoadingRows count={3} />}
        >
          {(data) => (
            <McpInstallInstructions endpoint={data.endpoint}>
              Keep the local server running while your agent uses Executor.
            </McpInstallInstructions>
          )}
        </QueryView>
      }
    />
  );
}
