import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import {
  isPaidForV2Import,
  v2ImportEligible,
  v2ImportUrl,
  type V2ImportSource,
  type V2ImportSubscription,
} from "./v2-import";

const USER = "user_signed_in";
const OTHER = "user_other";
const ORG = "org_example";

interface Facts {
  readonly emailVerified?: boolean;
  readonly members?: ReadonlyArray<string>;
  readonly subscriptions?: ReadonlyArray<V2ImportSubscription>;
  readonly failing?: "user" | "members" | "billing";
}

/** A source answering from fixed facts, recording which reads were made. */
const sourceOf = (facts: Facts) => {
  const reads: string[] = [];
  const answer = <A>(read: string, value: A) =>
    Effect.suspend(() => {
      reads.push(read);
      return facts.failing === read ? Effect.fail("unavailable") : Effect.succeed(value);
    });
  const source: V2ImportSource = {
    emailVerified: (userId) => {
      expect(userId).toBe(USER);
      return answer("user", facts.emailVerified ?? true);
    },
    activeMemberIds: (organizationId) => {
      expect(organizationId).toBe(ORG);
      return answer("members", facts.members ?? [USER]);
    },
    subscriptions: (organizationId) => {
      expect(organizationId).toBe(ORG);
      return answer("billing", facts.subscriptions ?? [{ planId: "free", status: "active" }]);
    },
  };
  return { source, reads };
};

describe("v2 import eligibility", () => {
  it.effect("admits a verified user who is the free org's only active member", () =>
    Effect.gen(function* () {
      const { source, reads } = sourceOf({});
      expect(yield* v2ImportEligible(source, USER, ORG)).toBe(true);
      expect(reads).toEqual(["user", "members", "billing"]);
    }),
  );

  it.effect("admits an org on the free pay-as-you-go plan or with no subscription", () =>
    Effect.gen(function* () {
      for (const subscriptions of [[{ planId: "free-pay-as-you-go", status: "active" }], []]) {
        const { source } = sourceOf({ subscriptions });
        expect(yield* v2ImportEligible(source, USER, ORG)).toBe(true);
      }
    }),
  );

  it.effect("refuses an unverified email without reading the org", () =>
    Effect.gen(function* () {
      const { source, reads } = sourceOf({ emailVerified: false });
      expect(yield* v2ImportEligible(source, USER, ORG)).toBe(false);
      expect(reads).toEqual(["user"]);
    }),
  );

  it.effect("refuses an org with more than one active member, without reading billing", () =>
    Effect.gen(function* () {
      const { source, reads } = sourceOf({ members: [USER, OTHER] });
      expect(yield* v2ImportEligible(source, USER, ORG)).toBe(false);
      expect(reads).toEqual(["user", "members"]);
    }),
  );

  it.effect("refuses an org whose only active member is someone else", () =>
    Effect.gen(function* () {
      for (const members of [[OTHER], []]) {
        const { source } = sourceOf({ members });
        expect(yield* v2ImportEligible(source, USER, ORG)).toBe(false);
      }
    }),
  );

  it.effect("refuses an org on a paid plan", () =>
    Effect.gen(function* () {
      const { source } = sourceOf({ subscriptions: [{ planId: "team", status: "active" }] });
      expect(yield* v2ImportEligible(source, USER, ORG)).toBe(false);
    }),
  );

  it.effect("refuses when any read is unavailable", () =>
    Effect.gen(function* () {
      for (const failing of ["user", "members", "billing"] as const) {
        const { source } = sourceOf({ failing });
        expect(yield* v2ImportEligible(source, USER, ORG), failing).toBe(false);
      }
    }),
  );
});

describe("v2 import paid plans", () => {
  it("counts every plan outside v2's free list that has not expired", () => {
    expect(isPaidForV2Import([{ planId: "team", status: "active" }])).toBe(true);
    expect(isPaidForV2Import([{ planId: "enterprise", status: "trialing" }])).toBe(true);
    expect(isPaidForV2Import([{ planId: "team", status: "past_due" }])).toBe(true);
    expect(isPaidForV2Import([{ planId: "team", status: "scheduled" }])).toBe(true);
    // A grandfathered or later plan v1 never listed is paid too.
    expect(isPaidForV2Import([{ planId: "professional", status: "active" }])).toBe(true);
    expect(
      isPaidForV2Import([
        { planId: "free", status: "active" },
        { planId: "team", status: "active" },
      ]),
    ).toBe(true);
  });

  it("does not count free plans or expired subscriptions", () => {
    expect(isPaidForV2Import([])).toBe(false);
    expect(isPaidForV2Import([{ planId: "free", status: "active" }])).toBe(false);
    expect(isPaidForV2Import([{ planId: "free-pay-as-you-go", status: "active" }])).toBe(false);
    expect(isPaidForV2Import([{ planId: "team", status: "expired" }])).toBe(false);
  });
});

describe("v2 import url", () => {
  const configured = {
    V2: { fetch: () => Promise.resolve(new Response(null)) },
    V2_SIGN_UP_URL: "https://app.example.test/login?mode=signup",
    V2_OAUTH_STATE_PREFIX: "x2.",
    V2_ANALYTICS_PROXY_PATH: "/api/0123456789abcdef",
    V2_ERROR_TUNNEL_PATH: "/api/fedcba9876543210/submit",
  };

  it("is the import page on v2's app host, the sign-up page's origin", () => {
    expect(v2ImportUrl(configured)?.href).toBe("https://app.example.test/v1-import");
  });

  it("is absent without the v2 settings or with broken ones", () => {
    expect(v2ImportUrl({})).toBeNull();
    expect(v2ImportUrl({ ...configured, V2_SIGN_UP_URL: "not a url" })).toBeNull();
    expect(v2ImportUrl({ ...configured, V2: undefined })).toBeNull();
  });
});
