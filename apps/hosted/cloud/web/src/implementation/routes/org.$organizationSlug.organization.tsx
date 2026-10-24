import { Suspense, useEffect, useState } from "react";
import { Link, createFileRoute, useLoaderData } from "@tanstack/react-router";
import { accessAtom } from "@executor-js/hosted-web/contracts/organization";
import { startAfterAccess } from "@executor-js/hosted-web/contracts/guarded-read";
import {
  loadMembers,
  OrganizationPage,
  type MemberLimit,
  type MembersReads,
} from "@executor-js/hosted-web/pages/organization";
import type { OrganizationReference } from "@executor-js/hosted-server/organization";
import { useOrganizationRoute } from "@executor-js/hosted-web/organization";
import { Button } from "@executor-js/ui/components/button";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { Loader, useAtomResult, type Handle } from "raf-effect-atom";
import { DeleteOrganization } from "../components/delete-organization.tsx";
import { SsoSettings, type SsoReads } from "../components/sso-settings.tsx";
import { BillingSettings } from "../components/billing-settings.tsx";
import { V1ImportSettings } from "../components/v1-import-links.tsx";
import { billingAtom, memberLimitAtom } from "../../contracts/billing.ts";
import { organizationRemovalPreviewAtom } from "../../contracts/organization-removal.ts";
import { ssoConnectionsAtom } from "../../contracts/sso.ts";

/** Members never read billing. Owners and admins do, and enterprise plans also read SSO. */
async function loadCloudOrganization(
  atoms: Loader.Loader,
  organization: OrganizationReference,
): Promise<
  | (MembersReads &
      SsoReads & {
        readonly memberLimit?: Handle<ReturnType<typeof memberLimitAtom>>;
        readonly removalPreview?: Handle<ReturnType<typeof organizationRemovalPreviewAtom>>;
      })
  | undefined
> {
  const members = await loadMembers(atoms, organization);
  if (members === undefined) return undefined;
  const access = Loader.result(await atoms.ensure(accessAtom(organization)));
  if (!AsyncResult.isSuccess(access) || access.value.role === "member") return members;
  const billing = atoms.prefetch(billingAtom(organization));
  const plan = Loader.result(await atoms.ensure(billingAtom(organization)));
  const enterprise = AsyncResult.isSuccess(plan) && plan.value.enterprise === true;
  const owner = access.value.role === "owner";
  return {
    ...members,
    billing,
    memberLimit: atoms.prefetchInBrowser(memberLimitAtom(organization)),
    ...(owner
      ? {
          removalPreview: atoms.prefetch(organizationRemovalPreviewAtom(access.value.organization)),
        }
      : {}),
    ...(enterprise
      ? { connections: atoms.prefetch(ssoConnectionsAtom(access.value.organization)) }
      : {}),
  };
}

/** Owners and admins see the plan's member limit and an upgrade prompt when it is reached. */
function MemberLimitRead({
  handle,
  onChange,
}: {
  readonly handle: Handle<ReturnType<typeof memberLimitAtom>>;
  readonly onChange: (limit: MemberLimit | undefined) => void;
}) {
  const organization = useOrganizationRoute();
  const result = useAtomResult(memberLimitAtom(organization.organization), handle);
  const confirmed = Option.getOrUndefined(AsyncResult.value(result));
  const slug = organization.slug;
  const limit = confirmed?.limit;
  useEffect(() => {
    onChange(
      limit === undefined
        ? undefined
        : {
            limit,
            upgrade: (
              <Button asChild>
                <Link
                  to="/org/$organizationSlug/billing"
                  params={{ organizationSlug: slug }}
                  search={{ organization: "", plan: "" }}
                >
                  Upgrade plan
                </Link>
              </Button>
            ),
          },
    );
  }, [limit, onChange, slug]);
  return null;
}

function CloudOrganizationPage() {
  const reads = Route.useLoaderData();
  const { v1Import } = useLoaderData({ from: "/org/$organizationSlug" });
  const [memberLimit, setMemberLimit] = useState<MemberLimit>();
  return (
    <>
      {reads?.memberLimit !== undefined && (
        <Suspense fallback={null}>
          <MemberLimitRead handle={reads.memberLimit} onChange={setMemberLimit} />
        </Suspense>
      )}
      <OrganizationPage
        emailInvitations
        memberLimit={memberLimit}
        reads={reads}
        footer={<DeleteOrganization removalPreview={reads?.removalPreview} />}
      >
        <BillingSettings />
        {/* Only enterprise plans show this card, and its plan check calls the billing provider;
          the rest of the page does not wait for it. */}
        <Suspense fallback={null}>
          <SsoSettings reads={reads} />
        </Suspense>
        <V1ImportSettings choices={v1Import} />
      </OrganizationPage>
    </>
  );
}

/** Cloud adds billing settings, the member limit and owner-only removal to the shared organization page. */
export const Route = createFileRoute("/org/$organizationSlug/organization")({
  loader: ({ context, params }) =>
    startAfterAccess(context.atoms, params.organizationSlug, (organization) =>
      loadCloudOrganization(context.atoms, organization),
    ),
  // A client navigation re-runs this loader. Keep the settings page once it is on screen.
  // The skeleton is for a load that does not resolve.
  pendingMs: 10_000,
  component: CloudOrganizationPage,
});
