import { OrganizationReference } from "@executor-js/hosted-server/organization";
import { Schema } from "effect";
import { AsyncResult, type Atom } from "effect/reactivity";
import { Loader } from "raf-effect-atom";
import { accessAtom } from "./organization.ts";

const organizationFromSlug = (slug: string) =>
  Schema.decodeUnknownSync(OrganizationReference)(slug);

/** Start the access check for this URL before the page renders. */
export const ensureOrganizationAccess = (atoms: Loader.Loader, organizationSlug: string) =>
  atoms.ensure(accessAtom(organizationFromSlug(organizationSlug)));

/**
 * Start reads that name an organization only after its access check succeeded.
 * A refusal, a failure, or no answer starts none of them, so the document never
 * carries their values.
 */
export const startAfterAccess = async <A>(
  atoms: Loader.Loader,
  organizationSlug: string,
  start: (organization: OrganizationReference) => A | Promise<A>,
): Promise<A | undefined> => {
  const organization = organizationFromSlug(organizationSlug);
  const access = await atoms.ensure(accessAtom(organization));
  if (!AsyncResult.isSuccess(Loader.result(access))) return undefined;
  return await start(organization);
};

/** Prefetch each read after access succeeded. */
export const prefetchAfterAccess = (
  atoms: Loader.Loader,
  organizationSlug: string,
  reads: (organization: OrganizationReference) => ReadonlyArray<Atom.Atom<unknown>>,
) =>
  startAfterAccess(atoms, organizationSlug, (organization) => {
    for (const read of reads(organization))
      atoms.prefetch(read as Atom.Atom<AsyncResult.AsyncResult<unknown, unknown>>);
  });
