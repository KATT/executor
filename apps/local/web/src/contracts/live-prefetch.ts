import type { Option } from "effect";
import { AsyncResult, type Atom } from "effect/reactivity";
import type { Loader } from "raf-effect-atom";

/**
 * Start the serializable snapshot a live view hydrates from. The snapshot's value is
 * `Option`, which the loader verbs do not accept.
 */
export const prefetchLiveSnapshot = <A>(
  atoms: Loader.Loader,
  snapshot: Atom.Atom<Option.Option<A>>,
) =>
  // TODO(raf-effect-atom gap: prefetch only accepts AsyncResult atoms, but the live snapshot is Option)
  atoms.prefetch(snapshot as unknown as Atom.Atom<AsyncResult.AsyncResult<A, never>>);
