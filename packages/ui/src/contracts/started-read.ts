import type { Handle } from "raf-effect-atom";
import type { AsyncResult, Atom } from "effect/reactivity";

/** A loader-started atom and the handle `useAtomResult` reads it with. */
export interface StartedRead<A, E> {
  readonly source: Atom.Atom<AsyncResult.AsyncResult<A, E>>;
  readonly handle: Handle<Atom.Atom<AsyncResult.AsyncResult<A, unknown>>>;
}

/**
 * Pair a view with a handle started from the serializable atom it points at.
 * The handle's success type is the source's, not the view's.
 */
export const started = <A, E>(
  source: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  handle: { readonly args: ReadonlyArray<unknown>; readonly key: string | undefined },
): StartedRead<A, E> => ({
  source,
  // TODO(raf-effect-atom gap: Handle types do not follow initialValueTarget)
  handle: { args: [], key: handle.key } as StartedRead<A, E>["handle"],
});
