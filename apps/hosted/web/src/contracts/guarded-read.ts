import { OrganizationReference } from "@executor-js/hosted-server/organization";
import { Schema } from "effect";
import { AsyncResult, type Atom } from "effect/reactivity";
import { Loader, type Handle } from "raf-effect-atom";
import { accessAtom } from "./organization.ts";

const organizationFromSlug = (slug: string) =>
  Schema.decodeUnknownSync(OrganizationReference)(slug);

/**
 * A check that has not answered by now is left out of the document. The browser reads it
 * itself. Longer than a local check, shorter than a read that never answers.
 */
const accessDeadlineMs = 2_000;

const readAccess = (atoms: Loader.Loader, organization: OrganizationReference) => {
  const read = atoms.ensure(accessAtom(organization));
  // The browser can wait: a held document check is not this navigation's request.
  if (typeof window !== "undefined") return read;
  return Promise.race([
    read,
    new Promise<undefined>((resolve) => {
      setTimeout(resolve, accessDeadlineMs);
    }),
  ]);
};

/** Start the access check for this URL before the page renders. */
export const ensureOrganizationAccess = (atoms: Loader.Loader, organizationSlug: string) =>
  readAccess(atoms, organizationFromSlug(organizationSlug));

/**
 * Start a read and, on the server, wait until it settles. The document then renders that result.
 * Waiting with a suspense fallback leaves HTML the browser does not reproduce, because a browser
 * read keeps the current page instead of suspending. The browser only starts the read.
 */
export const startRead = <S extends Atom.Atom<AsyncResult.AsyncResult<unknown, unknown>>>(
  atoms: Loader.Loader,
  atom: S,
): Promise<Handle<S>> => {
  // ArgsOf cannot see that an atom source takes no arguments while S is generic.
  const read = atoms as Loader.Loader & {
    readonly ensure: (source: S) => Promise<Handle<S>>;
    readonly prefetch: (source: S) => Handle<S>;
  };
  if (typeof window !== "undefined") return Promise.resolve(read.prefetch(atom));
  return read.ensure(atom).catch((error: unknown) => {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return read.prefetch(atom);
  });
};

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
  const access = await readAccess(atoms, organization);
  if (access === undefined || !AsyncResult.isSuccess(Loader.result(access))) return undefined;
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
