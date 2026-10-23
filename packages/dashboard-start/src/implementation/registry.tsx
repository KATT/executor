/// <reference types="vite/client" />
/**
 * One atom registry per router. On the server, a render that reads unresolved data suspends to
 * the nearest Suspense boundary, whose skeleton streams first; the content streams when the data
 * arrives. Every settled serializable atom streams to the browser ahead of the HTML that used it,
 * so hydration renders the same values without requesting them again. A loader that reads data
 * behind an access check `ensure`s the check first and starts those reads only after it succeeds.
 */
import { RegistryContext, scheduleTask } from "@effect/atom-react";
import type { AnyRouter } from "@tanstack/react-router";
import { Cause } from "effect";
import { AsyncResult, Atom, AtomRegistry, Hydration } from "effect/reactivity";
import { Loader, RequestRegistry, WaterfallDetection } from "raf-effect-atom";
import type { ReactNode } from "react";

interface DehydratedAtoms {
  readonly initial: ReadonlyArray<Hydration.DehydratedAtom>;
  readonly stream: ReadableStream<ReadonlyArray<Hydration.DehydratedAtom>>;
}

/** Stream settled values after the first flush; values rendered in the shell go in the first one. */
const streamAtoms = (
  router: AnyRouter,
  registry: AtomRegistry.AtomRegistry,
  dispose: () => void,
) => {
  const original = router.options.dehydrate;
  router.serverSsrLifecycle = {
    ...router.serverSsrLifecycle,
    onServerSsrAttach: [
      ...(router.serverSsrLifecycle?.onServerSsrAttach ?? []),
      // The request owns every atom fiber, including in-process reads still in flight.
      (serverSsr) => serverSsr.onCleanup(dispose),
    ],
  };
  router.options.dehydrate = async () => {
    const dehydrated = await original?.();
    // A value can change after it was sent, such as an organization target that a later access
    // check records. Send each settled value again whenever its encoding changes.
    const sent = new Map<string, string>();
    const settled = () => {
      const values: Array<Hydration.DehydratedAtomValue> = [];
      for (const [key, node] of registry.getNodes()) {
        if (typeof key !== "string" || !Atom.isSerializable(node.atom)) continue;
        const value = node.value();
        // Only outcomes are sent. An interrupted read ended with this request, not its data.
        if (
          AsyncResult.isAsyncResult(value) &&
          (AsyncResult.isInitial(value) ||
            (AsyncResult.isFailure(value) && Cause.hasInterruptsOnly(value.cause)))
        )
          continue;
        // A value outside the atom's codec, such as a transport failure, is read again by the
        // browser after hydration.
        let encoded: unknown;
        try {
          encoded = node.atom[Atom.SerializableTypeId].encode(value);
        } catch {
          continue;
        }
        const json = JSON.stringify(encoded);
        if (sent.get(key) === json) continue;
        sent.set(key, json);
        values.push({
          "~effect/reactivity/Hydration/DehydratedAtom": true,
          key,
          value: encoded,
          dehydratedAt: Date.now(),
        });
      }
      return values;
    };
    const initial = settled();
    let controller!: ReadableStreamDefaultController<ReadonlyArray<Hydration.DehydratedAtom>>;
    const stream = new ReadableStream<ReadonlyArray<Hydration.DehydratedAtom>>({
      start: (value) => {
        controller = value;
      },
    });
    let open = true;
    let scheduled = false;
    const flush = () => {
      scheduled = false;
      if (!open) return;
      const values = settled();
      if (values.length > 0) controller.enqueue(values);
    };
    // Settled values are sent in the same task, before React retries the suspended render.
    const schedule = () => {
      if (scheduled || !open) return;
      scheduled = true;
      queueMicrotask(flush);
    };
    for (const node of registry.getNodes().values()) registry.subscribe(node.atom, schedule);
    registry.onNodeAdded = (node) => {
      registry.subscribe(node.atom, schedule);
    };
    router.serverSsr?.onRenderFinished(() => {
      flush();
      open = false;
      controller.close();
    });
    return { ...dehydrated, atoms: { initial, stream } satisfies DehydratedAtoms };
  };
};

/**
 * New values preload atoms before they are first read. A later value for an atom the page has
 * already created replaces its state, when that atom is writable state rather than a query. A
 * query the page started before its value arrived, such as one in a region the browser rendered
 * itself, takes the server's value while it is still loading; a value the browser already has
 * is newer than the page's.
 */
const applyAtoms = (
  registry: AtomRegistry.AtomRegistry,
  values: ReadonlyArray<Hydration.DehydratedAtom>,
) => {
  const nodes = registry.getNodes();
  const loading: Array<Atom.Atom<unknown>> = [];
  const fresh = Hydration.toValues(values).filter((entry) => {
    const node = nodes.get(entry.key);
    if (node === undefined || !Atom.isSerializable(node.atom)) return true;
    const atom = node.atom;
    if (Atom.isWritable(atom)) {
      registry.set(atom, atom[Atom.SerializableTypeId].decode(entry.value));
      return false;
    }
    // A node that has not been read yet takes the preloaded value when it is.
    if (node.currentState() !== "valid") return true;
    const current = node.value();
    if (!AsyncResult.isAsyncResult(current) || !AsyncResult.isInitial(current)) return false;
    loading.push(atom);
    return true;
  });
  Hydration.hydrate(registry, fresh);
  // Reading an existing node applies its preloaded value and notifies the components using it.
  for (const atom of loading) registry.get(atom);
};

/** Apply the server's values before hydration reaches the components that read them. */
const hydrateAtoms = (router: AnyRouter, registry: AtomRegistry.AtomRegistry) => {
  const original = router.options.hydrate;
  router.options.hydrate = async (dehydrated: { readonly atoms: DehydratedAtoms }) => {
    await original?.(dehydrated);
    applyAtoms(registry, dehydrated.atoms.initial);
    const reader = dehydrated.atoms.stream.getReader();
    void (async () => {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        applyAtoms(registry, value);
      }
    })().catch((error: unknown) => console.error("Dashboard data stream failed", error));
  };
};

/**
 * Create the registry for one router. `initialValues` are values known before rendering, such as
 * browser entry data or a server-verified session. `connect` joins it to Start's streaming.
 */
type InitialValues = NonNullable<
  NonNullable<Parameters<typeof AtomRegistry.make>[0]>["initialValues"]
>;

export const dashboardRegistry = (initialValues: InitialValues) => {
  const server = import.meta.env.SSR;
  // Hand-composed with the router's own dehydrate: a request registry, `Loader.make`, and this
  // stream. Guarded reads are not started here; their loaders `ensure` the access check first.
  const registry = server
    ? RequestRegistry.make({ initialValues })
    : AtomRegistry.make({ initialValues, scheduleTask, defaultIdleTTL: 400 });
  const atoms = Loader.make(registry);
  return {
    registry,
    atoms,
    connect: <R extends AnyRouter>(router: R): R => {
      if (server) streamAtoms(router, registry, () => registry.dispose());
      else hydrateAtoms(router, registry);
      return router;
    },
    Wrap: ({ children }: { readonly children: ReactNode }) => (
      <RegistryContext.Provider value={registry}>
        <WaterfallDetection mode="throw">{children}</WaterfallDetection>
      </RegistryContext.Provider>
    ),
  };
};
