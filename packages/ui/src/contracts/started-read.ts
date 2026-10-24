import type { Handle } from "raf-effect-atom";
import type { AsyncResult, Atom } from "effect/reactivity";

/**
 * A loader-started atom and the handle `useAtomResult` reads it with.
 * The handle is the one `prefetch` returned for this source, or for the atom it derives.
 */
export interface StartedRead<A, E> {
  readonly source: Atom.Atom<AsyncResult.AsyncResult<A, E>>;
  readonly handle: Handle<Atom.Atom<AsyncResult.AsyncResult<A, unknown>>>;
  /**
   * Boundary hook for this read. It runs where the result is read, and throws the failures that
   * boundary claims. A failure with no typed error stays in the result: the hook would throw it.
   */
  readonly claim?:
    | (<R extends AsyncResult.AsyncResult<unknown, unknown>>(
        result: R,
      ) => AsyncResult.AsyncResult<unknown, unknown>)
    | undefined;
}
