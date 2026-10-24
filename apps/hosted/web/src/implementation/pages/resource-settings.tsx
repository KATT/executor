/** Hosted access settings use the same persisted policy enforced by execution. */
import { useAtomSet } from "@effect/atom-react";
import type { Handle } from "raf-effect-atom";
import type { AppId, AccountId } from "@executor-js/sdk";
import { QueryView } from "@executor-js/ui/dashboard/context";
import { DetailSkeleton } from "@executor-js/ui/dashboard/loading";
import {
  appAccessAtom,
  accountAccessAtom,
  shareAppAtom,
  shareAccountAtom,
} from "../../contracts/resource-access.ts";
import { groupsAtom } from "../../contracts/groups.ts";
import { HostedFailure } from "../components/dashboard-bindings.tsx";
import { useOrganizationRoute } from "../components/organization.tsx";
import { SharingEditor } from "../components/sharing.tsx";
/** These controls change app and account access; linked accounts are separate. */
export function AppAccessSettings({
  app,
  userId,
  access,
  groups,
}: {
  readonly app: AppId;
  readonly userId: string | undefined;
  readonly access: Handle<ReturnType<typeof appAccessAtom>>;
  readonly groups: Handle<ReturnType<typeof groupsAtom>>;
}) {
  const { organization } = useOrganizationRoute();
  const save = useAtomSet(shareAppAtom({ organization, app }), { mode: "promiseExit" });
  const user = userId;
  const accessRead = { source: appAccessAtom({ organization, app }), handle: access };
  const groupsRead = { source: groupsAtom(organization), handle: groups };
  return (
    <section className="max-w-xl space-y-4">
      <h2 className="text-base font-medium">App access</h2>
      <QueryView
        query={appAccessAtom({ organization, app })}
        read={accessRead}
        Failure={HostedFailure}
        pending={<DetailSkeleton label="Loading app access" />}
      >
        {(access) => (
          <QueryView
            query={groupsAtom(organization)}
            read={groupsRead}
            Failure={HostedFailure}
            pending={<DetailSkeleton label="Loading groups" />}
          >
            {(data) => (
              <SharingEditor
                disabledReason={
                  access.canManage
                    ? undefined
                    : "Only the app creator and organization admins can change app access."
                }
                mode="app"
                value={access.audience}
                revision={access.revision}
                allowPrivate={access.creator !== null}
                privateLabel={access.creator === user ? "Only me" : "Only the creator"}
                groups={data.groups}
                save={(audience, revision) => save({ audience, revision })}
              />
            )}
          </QueryView>
        )}
      </QueryView>
    </section>
  );
}
/** Personal accounts remain private; shared account grants are independent of app sharing. */
export function AccountAccessSettings({ account }: { readonly account: AccountId }) {
  const { organization } = useOrganizationRoute();
  const save = useAtomSet(shareAccountAtom({ organization, account }), { mode: "promiseExit" });
  return (
    <section className="space-y-4">
      <QueryView
        query={accountAccessAtom({ organization, account })}
        Failure={HostedFailure}
        pending={<DetailSkeleton label="Loading account access" />}
      >
        {(access) =>
          access.ownership.kind === "personal" ? (
            <p className="text-sm text-muted-foreground">Personal account · Only you can use it.</p>
          ) : (
            <QueryView
              query={groupsAtom(organization)}
              Failure={HostedFailure}
              pending={<DetailSkeleton label="Loading groups" />}
            >
              {(data) =>
                access.ownership.kind === "shared" && (
                  <SharingEditor
                    disabledReason={
                      access.canManage
                        ? undefined
                        : "Only the account creator and organization admins can change account access."
                    }
                    mode="account"
                    value={access.ownership.audience}
                    revision={access.revision}
                    groups={data.groups}
                    save={(audience, revision) => save({ audience, revision })}
                  />
                )
              }
            </QueryView>
          )
        }
      </QueryView>
    </section>
  );
}
