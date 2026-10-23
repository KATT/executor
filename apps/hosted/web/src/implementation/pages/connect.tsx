import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { Loader } from "raf-effect-atom";
import { OrganizationReference } from "@executor-js/hosted-server/organization";
import { Button } from "@executor-js/ui/components/button";
import { Code } from "@executor-js/ui/dashboard/code";
import { McpInstallInstructions } from "@executor-js/ui/dashboard/connect";
import {
  ScopedConnectionsPage,
  type ScopedConnectionLinkProps,
  type ScopedConnectionScreen,
  type ScopedConnectionTargetLinkProps,
} from "@executor-js/ui/dashboard/scoped-connections";
import { ConnectedAgents } from "@executor-js/ui/dashboard/connected-agents";
import { ConnectionToolPicker } from "@executor-js/ui/dashboard/connection-tool-picker";
import { useOrganizationRoute } from "../components/organization.tsx";
import { HostedFailure } from "../components/dashboard-bindings.tsx";
import { resourceInventoryAtom } from "../../contracts/resource-access.ts";
import { connectionToolListAtom } from "../../contracts/apps.ts";
import { parseConnectSearch } from "../../contracts/navigation.ts";
import {
  mcpAgentsAtom,
  mcpConnectionsAtom,
  revokeMcpAgentAtom,
  revokeMcpConnectionAtom,
  saveMcpConnectionAtom,
} from "../../contracts/mcp-connections.ts";
import { useDocumentationUrl } from "../documentation.ts";
import { useResourceOrigins } from "../resource-origin.ts";
import {
  AccessBoundary,
  AvailabilityBoundary,
  SessionBoundary,
  useAccessBoundary,
} from "../components/read-boundaries.tsx";
import { startAfterAccess } from "../../contracts/guarded-read.ts";

const organizationFromSlug = (slug: string) =>
  Schema.decodeUnknownSync(OrganizationReference)(slug);

const connectReads = async (
  atoms: Loader.Loader,
  organization: ReturnType<typeof organizationFromSlug>,
  search: { readonly app?: string | undefined; readonly version?: string | undefined },
) => {
  const parsed = parseConnectSearch(search);
  const directory = atoms.prefetch(resourceInventoryAtom(organization));
  const connections = atoms.prefetch(mcpConnectionsAtom(organization));
  const agents = atoms.prefetch(mcpAgentsAtom(organization));
  const listed =
    parsed.app !== undefined && parsed.version !== undefined
      ? {
          version: parsed.version,
          handle: atoms.prefetch(
            connectionToolListAtom({
              organization,
              app: parsed.app,
              version: parsed.version,
            }),
          ),
        }
      : undefined;
  if (listed !== undefined || parsed.app === undefined) {
    return { directory, connections, agents, tools: listed };
  }
  const inventory = await atoms.ensure(resourceInventoryAtom(organization));
  const result = Loader.result(inventory);
  const active = AsyncResult.isSuccess(result)
    ? result.value.apps.find((item) => item.id === parsed.app)?.activeVersion
    : undefined;
  return {
    directory,
    connections,
    agents,
    tools:
      active == null
        ? undefined
        : {
            version: active,
            handle: atoms.prefetch(
              connectionToolListAtom({ organization, app: parsed.app, version: active }),
            ),
          },
  };
};

export type HostedConnectReads = Awaited<ReturnType<typeof connectReads>>;

/** Start the connect page's reads after this organization's access check succeeded. */
export function loadConnect({
  atoms,
  organizationSlug,
  search = {},
}: {
  readonly atoms: Loader.Loader;
  readonly organizationSlug: string;
  readonly search?: { readonly app?: string | undefined; readonly version?: string | undefined };
}) {
  return startAfterAccess(atoms, organizationSlug, (organization) =>
    connectReads(atoms, organization, search),
  );
}

/** Headless setup: a personal access token against this organization's own addresses. */
function PersonalTokenSetup({
  apiOrigin,
  mcpOrigin,
}: {
  readonly apiOrigin: string;
  readonly mcpOrigin: string;
}) {
  const { organization, slug, id } = useOrganizationRoute();
  const mcp = JSON.stringify(
    {
      mcpServers: {
        executor: {
          type: "http",
          url: `${mcpOrigin}/org/${encodeURIComponent(slug)}/mcp`,
          headers: { Authorization: "Bearer <YOUR_PAT>" },
        },
      },
    },
    null,
    2,
  );
  const http = `curl '${apiOrigin}/api/organizations/${encodeURIComponent(id ?? organization)}/inventory' \\\n  --header 'Authorization: Bearer <YOUR_PAT>'`;
  return (
    <>
      <p className="text-[13px] leading-5 text-muted-foreground">
        For scripts and agents that cannot sign in. The token is yours and has your permissions
        here; this URL names the organization, so no organization header is needed.
      </p>
      <div className="mt-3 overflow-hidden rounded-lg border">
        <Code code={mcp} path="mcp.json" lineNumbers={false} copyable />
      </div>
      <div className="mt-3 overflow-hidden rounded-lg border">
        <Code code={http} path="request.sh" lineNumbers={false} copyable />
      </div>
      <div className="mt-3">
        <Button asChild variant="outline" size="sm">
          <Link to="/account/tokens" search={{ organization: slug }}>
            Manage tokens
          </Link>
        </Button>
      </div>
    </>
  );
}

function ListLink(props: ScopedConnectionLinkProps) {
  const { slug: organizationSlug } = useOrganizationRoute();
  return <Link {...props} to="/org/$organizationSlug/connect" params={{ organizationSlug }} />;
}

function CreateLink(props: ScopedConnectionLinkProps) {
  const { slug: organizationSlug } = useOrganizationRoute();
  return <Link {...props} to="/org/$organizationSlug/connect/new" params={{ organizationSlug }} />;
}

function DetailLink({ connection, ...props }: ScopedConnectionTargetLinkProps) {
  const { slug: organizationSlug } = useOrganizationRoute();
  return (
    <Link
      {...props}
      to="/org/$organizationSlug/connect/$connectionId"
      params={{ organizationSlug, connectionId: connection }}
    />
  );
}

function EditLink({ connection, ...props }: ScopedConnectionTargetLinkProps) {
  const { slug: organizationSlug } = useOrganizationRoute();
  return (
    <Link
      {...props}
      to="/org/$organizationSlug/connect/$connectionId/edit"
      params={{ organizationSlug, connectionId: connection }}
    />
  );
}

/** The member's full-access URL, scoped connections and connected agents for this organization. */
export function ConnectPage({
  screen = { kind: "list" },
  reads,
}: {
  readonly screen?: ScopedConnectionScreen;
  readonly reads: HostedConnectReads | undefined;
}) {
  if (reads === undefined) return null;
  return (
    <SessionBoundary>
      <AvailabilityBoundary>
        <AccessBoundary>
          <Connect screen={screen} reads={reads} />
        </AccessBoundary>
      </AvailabilityBoundary>
    </SessionBoundary>
  );
}

function Connect({
  screen,
  reads,
}: {
  readonly screen: ScopedConnectionScreen;
  readonly reads: HostedConnectReads;
}) {
  const origins = useResourceOrigins();
  const mcpOrigin = origins.mcp[0];
  const { slug: organizationSlug } = useOrganizationRoute();
  const navigate = useNavigate();
  const docs = useDocumentationUrl();
  const claims = useAccessBoundary();
  const organizationKey = organizationFromSlug(organizationSlug);
  const search = parseConnectSearch(useLocation().search);
  const tools =
    reads.tools === undefined || search.app === undefined
      ? undefined
      : {
          source: claims.wrap(
            connectionToolListAtom({
              organization: organizationKey,
              app: search.app,
              version: reads.tools.version,
            }),
          ),
          handle: reads.tools.handle,
        };
  return (
    <ScopedConnectionsPage
      screen={screen}
      links={{ ListLink, CreateLink, DetailLink, EditLink }}
      onSaved={(saved) => {
        void navigate({
          to: "/org/$organizationSlug/connect/$connectionId",
          params: { organizationSlug, connectionId: saved.id },
          replace: true,
        });
      }}
      onRevoked={() => {
        void navigate({
          to: "/org/$organizationSlug/connect",
          params: { organizationSlug },
          replace: true,
        });
      }}
      key={organizationKey}
      query={{
        source: claims.wrap(resourceInventoryAtom(organizationKey)),
        handle: reads.directory,
      }}
      connections={{
        source: claims.wrap(mcpConnectionsAtom(organizationKey)),
        handle: reads.connections,
      }}
      save={saveMcpConnectionAtom(organizationKey)}
      revoke={revokeMcpConnectionAtom(organizationKey)}
      Failure={HostedFailure}
      toolsApp={search.app}
      onToolsApp={(next) => {
        const search = {
          app: next?.id,
          version: next?.version ?? undefined,
        };
        if (screen.kind === "detail") {
          void navigate({
            to: "/org/$organizationSlug/connect/$connectionId",
            params: { organizationSlug, connectionId: screen.connection },
            search,
            replace: true,
          });
          return;
        }
        if (screen.kind === "edit") {
          void navigate({
            to: "/org/$organizationSlug/connect/$connectionId/edit",
            params: { organizationSlug, connectionId: screen.connection },
            search,
            replace: true,
          });
          return;
        }
        if (screen.kind === "new") {
          void navigate({
            to: "/org/$organizationSlug/connect/new",
            params: { organizationSlug },
            search,
            replace: true,
          });
          return;
        }
        void navigate({
          to: "/org/$organizationSlug/connect",
          params: { organizationSlug },
          search,
          replace: true,
        });
      }}
      docs={docs}
      agents={
        <ConnectedAgents
          read={{
            source: claims.wrap(mcpAgentsAtom(organizationKey)),
            handle: reads.agents,
          }}
          revoke={revokeMcpAgentAtom(organizationKey)}
          Failure={HostedFailure}
        />
      }
      installation={
        <McpInstallInstructions
          endpoint={`${mcpOrigin}/mcp`}
          docs={docs}
          token={<PersonalTokenSetup apiOrigin={origins.api[0]} mcpOrigin={mcpOrigin} />}
        />
      }
      renderTools={({ app, names, onChange }) =>
        tools === undefined ? (
          <p className="px-4 py-6 text-xs text-muted-foreground">
            Deploy this app to choose its tools.
          </p>
        ) : (
          <ConnectionToolPicker
            query={connectionToolListAtom({
              organization: organizationKey,
              app: app.id,
              version: app.activeVersion ?? undefined,
            })}
            read={tools}
            Failure={HostedFailure}
            names={names}
            onChange={onChange}
          />
        )
      }
    />
  );
}
