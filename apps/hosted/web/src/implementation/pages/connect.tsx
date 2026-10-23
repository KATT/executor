import { Link, useNavigate } from "@tanstack/react-router";
import { Schema } from "effect";
import type { Loader } from "raf-effect-atom";
import { started } from "@executor-js/ui/contracts/started-read";
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
import { resourceDirectoryQuery, resourceInventoryAtom } from "../../contracts/resource-access.ts";
import { connectionToolListAtom } from "../../contracts/apps.ts";
import {
  mcpAgentsAtom,
  mcpAgentsQuery,
  mcpConnectionsAtom,
  mcpConnectionsQuery,
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
import type { OrganizationPageReads } from "../components/organization.tsx";

const organizationFromSlug = (slug: string) =>
  Schema.decodeUnknownSync(OrganizationReference)(slug);

/** Start the connect page's reads from the URL, before the first component renders. */
export function loadConnect({
  atoms,
  organizationSlug,
}: {
  readonly atoms: Loader.Loader;
  readonly organizationSlug: string;
}) {
  const organization = organizationFromSlug(organizationSlug);
  return {
    directory: atoms.prefetch(resourceDirectoryQuery(organization)),
    connections: atoms.prefetch(mcpConnectionsQuery(organization)),
    agents: atoms.prefetch(mcpAgentsQuery(organization)),
  };
}

export type HostedConnectReads = ReturnType<typeof loadConnect>;

/** The same atoms the loader starts, named so a failed access check withholds them. */
export const connectOrganizationReads: OrganizationPageReads = (_organization, params) => {
  const slug = params.organizationSlug;
  if (typeof slug !== "string") return [];
  const organization = organizationFromSlug(slug);
  return [
    resourceDirectoryQuery(organization),
    mcpConnectionsQuery(organization),
    mcpAgentsQuery(organization),
  ];
};

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
  readonly reads: HostedConnectReads;
}) {
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
      query={started(claims.wrap(resourceInventoryAtom(organizationKey)), reads.directory)}
      connections={started(claims.wrap(mcpConnectionsAtom(organizationKey)), reads.connections)}
      save={saveMcpConnectionAtom(organizationKey)}
      revoke={revokeMcpConnectionAtom(organizationKey)}
      Failure={HostedFailure}
      docs={docs}
      agents={
        <ConnectedAgents
          read={started(claims.wrap(mcpAgentsAtom(organizationKey)), reads.agents)}
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
      renderTools={({ app, names, onChange }) => (
        // TODO(raf-effect-atom gap: Loader verbs die on derived atoms instead of following initialValueTarget)
        // TODO(raf-effect-atom gap: Tool list state is not a URL the loader can prefetch)
        <ConnectionToolPicker
          query={connectionToolListAtom({
            organization: organizationKey,
            app: app.id,
            version: app.activeVersion ?? undefined,
          })}
          Failure={HostedFailure}
          names={names}
          onChange={onChange}
        />
      )}
    />
  );
}
