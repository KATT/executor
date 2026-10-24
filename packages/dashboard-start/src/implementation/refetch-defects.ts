/**
 * AtomHttpApi turns a transport failure or a response that does not decode into
 * a defect. The atom keeps that defect, and `ensure` returns it without a new
 * request. A route error view retries by fetching those atoms, then invalidating
 * the router so its loaders read the new result.
 */
import { RegistryContext } from "@effect/atom-react";
import { useRouter } from "@tanstack/react-router";
import { Cause, Option } from "effect";
import { AsyncResult, type Atom, type AtomRegistry } from "effect/reactivity";
import type { Loader } from "raf-effect-atom";
import { useContext, useState } from "react";

const isHeldDefect = (value: unknown): value is AsyncResult.Failure<unknown, unknown> =>
  AsyncResult.isAsyncResult(value) &&
  AsyncResult.isFailure(value) &&
  !Cause.hasInterruptsOnly(value.cause) &&
  Option.isNone(Cause.findErrorOption(value.cause));

/** Fetch every atom still holding a defect. Typed failures stay for their boundaries. */
export const refetchHeldDefects = (
  registry: AtomRegistry.AtomRegistry,
  atoms: Loader.Loader,
): Promise<void> =>
  Promise.all(
    [...registry.getNodes().values()].flatMap((node) => {
      if (!isHeldDefect(node.value())) return [];
      return [atoms.fetch(node.atom as Atom.Atom<AsyncResult.AsyncResult<unknown, unknown>>)];
    }),
  ).then(() => undefined);

/** Retry the page after a defect. `reset` only re-renders the held error. */
export function useRefetchHeldDefects(reset: (() => void) | undefined): {
  readonly retry: () => void;
  readonly retrying: boolean;
} {
  const registry = useContext(RegistryContext);
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const retry = () => {
    if (retrying) return;
    setRetrying(true);
    const atoms = (router.options.context as { readonly atoms?: Loader.Loader | undefined }).atoms;
    void (async () => {
      try {
        if (atoms !== undefined) await refetchHeldDefects(registry, atoms);
        await router.invalidate();
        reset?.();
      } catch {
        setRetrying(false);
      }
    })();
  };
  return { retry, retrying };
}
