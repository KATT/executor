import type { Handle } from "raf-effect-atom";
import type { AsyncResult, Atom } from "effect/reactivity";

/**
 * A loader-started atom and the handle `useAtomResult` reads it with.
 * The handle is the one `prefetch` returned for this source, or for the atom it derives.
 */
export interface StartedRead<A, E> {
  readonly source: Atom.Atom<AsyncResult.AsyncResult<A, E>>;
  readonly handle: Handle<Atom.Atom<AsyncResult.AsyncResult<A, unknown>>>;
}
