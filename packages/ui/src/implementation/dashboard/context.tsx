import { Suspense, createContext, useContext, type ReactNode } from "react";
import { RegistryContext, useAtomMount, useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Hydration, useAtomResult, useWaterfall } from "raf-effect-atom";
import { Cause, Option } from "effect";
import { Skeleton } from "../components/skeleton.tsx";
import { AsyncResult, Atom } from "effect/reactivity";
import type { DashboardBindings, Query, QueryProps } from "../../contracts/dashboard.ts";
import type { StartedRead } from "../../contracts/started-read.ts";

const Context = createContext<DashboardBindings | null>(null);
/** Bind product navigation and icon metadata, without an HTTP client or an auth context. */
export function DashboardProvider({
  children,
  ...bindings
}: DashboardBindings & { readonly children: ReactNode }) {
  return <Context value={bindings}>{children}</Context>;
}
/** Shared pages use product navigation without importing its router. */
export function useDashboard() {
  const value = useContext(Context);
  if (value === null) throw new Error("DashboardProvider must enclose this page");
  return value;
}
/** Icons can also render outside an authenticated dashboard, using an explicit provider URL. */
export const useOptionalDashboard = () => useContext(Context);
/** Read the current value or a previous success, when the source provides one. */
export function useQuery<A, E>(atom: Query<A, E>) {
  const result = useAtomValue(atom);
  const refresh = useAtomRefresh(atom);
  return { result, data: AsyncResult.value(result), refresh };
}

/**
 * Start a query whose key exists only in this render, then read the settled result. The caller
 * suspends until it settles, so it needs a Suspense boundary.
 */
export function useWaterfallQuery<A, E>(query: Query<A, E>) {
  const handle = useWaterfall(query);
  const result = useAtomResult(query, handle);
  const refresh = useAtomRefresh(query);
  return { result, data: AsyncResult.value(result), refresh };
}

const serverWaits = new WeakMap<object, WeakMap<object, Promise<void>>>();
const refreshingFailures = new WeakMap<object, WeakMap<object, Promise<void>>>();

/**
 * On the server, wait until an initial read settles so the document contains it. The browser
 * keeps the current result, including the page's own pending state while a refresh is in flight.
 */
export function suspendIfUnsettled<A, E>(
  registry: {
    readonly subscribe: (
      atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
      onResult: (result: AsyncResult.AsyncResult<A, E>) => void,
    ) => () => void;
  },
  atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  result: AsyncResult.AsyncResult<A, E>,
) {
  if (typeof window !== "undefined" || !AsyncResult.isInitial(result)) return;
  let atoms = serverWaits.get(registry);
  if (atoms === undefined) {
    atoms = new WeakMap();
    serverWaits.set(registry, atoms);
  }
  let promise = atoms.get(atom);
  if (promise === undefined) {
    promise = new Promise<void>((resolve) => {
      const dispose = registry.subscribe(atom, (next) => {
        if (AsyncResult.isInitial(next)) return;
        dispose();
        resolve();
      });
    });
    atoms.set(atom, promise);
  }
  throw promise;
}

/**
 * A handler's reset refreshes a failed atom and leaves the old failure marked waiting.
 * Suspending until that refresh settles keeps the handler from painting the old failure again.
 */
function suspendWhileRefreshingFailure<A, E>(
  registry: {
    readonly subscribe: (
      atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
      onResult: (result: AsyncResult.AsyncResult<A, E>) => void,
    ) => () => void;
  },
  atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  result: AsyncResult.AsyncResult<A, E>,
) {
  if (!(AsyncResult.isFailure(result) && result.waiting)) return;
  let found = refreshingFailures.get(registry);
  if (found === undefined) {
    found = new WeakMap();
    refreshingFailures.set(registry, found);
  }
  const atoms = found;
  let promise = atoms.get(atom);
  if (promise === undefined) {
    promise = new Promise<void>((resolve) => {
      const dispose = registry.subscribe(atom, (next) => {
        if (AsyncResult.isFailure(next) && next.waiting) return;
        dispose();
        atoms.delete(atom);
        resolve();
      });
    });
    atoms.set(atom, promise);
  }
  throw promise;
}

/**
 * The atom the server sent, or `source` when it has no serializable value of its own.
 * A revalidated view points at that value with `initialValueTarget`.
 */
function hydratedRead<A>(source: Atom.Atom<A>): {
  readonly pin: Atom.Atom<unknown>;
  readonly read: Atom.Atom<A>;
} {
  let serializable: Atom.Atom<unknown> | undefined;
  for (
    let target: Atom.Atom<unknown> | undefined = source;
    target !== undefined;
    target = target.initialValueTarget
  ) {
    if (Atom.isSerializable(target)) {
      serializable = target;
      break;
    }
  }
  if (serializable === undefined) return { pin: source, read: source };
  const kept = Hydration.hydrated(serializable);
  return { pin: kept, read: serializable === source ? (kept as Atom.Atom<A>) : source };
}

/**
 * Build the serializable node from the value the server sent before anything reads a derived
 * view of it. The derived view is not itself serializable, so reading it first would run the
 * request again.
 */
export function pinHydratedValue<A>(
  registry: { readonly get: (atom: Atom.Atom<unknown>) => unknown },
  source: Atom.Atom<A>,
) {
  const kept = hydratedRead(source);
  if (kept.pin !== kept.read) registry.get(kept.pin);
}

/**
 * Read a handle the route loader started. The server suspends until a prefetch settles. The
 * browser renders the current result, so a pending read stays on the page and a refresh keeps
 * that page mounted. The first browser read keeps the value the server sent; reading the atom
 * directly would run its effect again and replace that HTML. A browser-only read is not waited
 * on: the server has no result for it. A boundary-claimed failure that is still refreshing
 * suspends in `useClaimedResult`, after the hook has been given an initial result.
 */
export function useStartedQuery<A, E>(read: StartedRead<A, E>) {
  const registry = useContext(RegistryContext);
  const kept = hydratedRead(read.source);
  // Pin the serializable atom before anything reads the raw one, or its effect replaces the
  // hydrated value during this render.
  if (kept.pin !== kept.read) registry.get(kept.pin);
  useAtomMount(kept.read);
  const result = useAtomValue(kept.read);
  // The loader lease stays until `useAtomResult` mounts this atom, or until `Loader.LeaseTTL`
  // (30 seconds) on a browser registry. A request registry keeps it until that registry is
  // disposed. `useAtomValue` does not end the lease, and the published package does not export
  // a release for this read.
  const refresh = useAtomRefresh(kept.read);
  if (read.handle.inBrowser !== true) suspendIfUnsettled(registry, kept.read, result);
  return { result, data: AsyncResult.value(result), refresh };
}

/**
 * Run a boundary hook on a read. A failure with no typed error is a transport defect the page
 * renders itself, and a failure that is still refreshing is the error a handler would paint
 * again. The hook throws both, so it sees an initial result instead. Only this claimed read
 * suspends while the failure refreshes: a page with no boundary keeps its rows up.
 */
export function useClaimedResult<A, E>(
  source: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  result: AsyncResult.AsyncResult<A, E>,
  useClaim: NonNullable<StartedRead<A, E>["claim"]>,
): AsyncResult.AsyncResult<A, E> {
  const registry = useContext(RegistryContext);
  const refreshing = AsyncResult.isFailure(result) && result.waiting;
  const defect =
    AsyncResult.isFailure(result) && Option.isNone(Cause.findErrorOption(result.cause));
  const claimed = useClaim(refreshing || defect ? AsyncResult.initial<A, E>(false) : result);
  if (refreshing) suspendWhileRefreshingFailure(registry, source, result);
  return defect ? result : (claimed as AsyncResult.AsyncResult<A, E>);
}

/** Apply `claim` where this result is read. Without one, the result is unchanged. */
export function ClaimResult<A, E>({
  source,
  result,
  claim,
  children,
}: {
  readonly source: Atom.Atom<AsyncResult.AsyncResult<A, E>>;
  readonly result: AsyncResult.AsyncResult<A, E>;
  readonly claim: StartedRead<A, E>["claim"];
  readonly children: (result: AsyncResult.AsyncResult<A, E>) => ReactNode;
}) {
  if (claim === undefined) return children(result);
  return (
    <ClaimedResultBody source={source} result={result} claim={claim}>
      {children}
    </ClaimedResultBody>
  );
}

function ClaimedResultBody<A, E>({
  source,
  result,
  claim,
  children,
}: {
  readonly source: Atom.Atom<AsyncResult.AsyncResult<A, E>>;
  readonly result: AsyncResult.AsyncResult<A, E>;
  readonly claim: NonNullable<StartedRead<A, E>["claim"]>;
  readonly children: (result: AsyncResult.AsyncResult<A, E>) => ReactNode;
}) {
  return children(useClaimedResult(source, result, claim));
}

/** Loading/failure rendering follows the same source lifetime in every host. */
export function QueryView<A, E>({
  query,
  read,
  Failure,
  children,
  pending = <LoadingRows />,
}: QueryProps<A, E> & {
  readonly read?: StartedRead<A, E> | undefined;
  readonly children: (value: A) => ReactNode;
  readonly pending?: ReactNode;
}) {
  if (read !== undefined)
    return (
      <StartedQueryView
        source={read.source}
        handle={read.handle}
        claim={read.claim}
        Failure={Failure}
        pending={pending}
      >
        {children}
      </StartedQueryView>
    );
  return (
    <QueryViewQuery query={query} Failure={Failure} pending={pending}>
      {children}
    </QueryViewQuery>
  );
}

function QueryViewQuery<A, E>({
  query,
  Failure,
  children,
  pending,
}: QueryProps<A, E> & {
  readonly children: (value: A) => ReactNode;
  readonly pending: ReactNode;
}) {
  return (
    <Suspense fallback={pending}>
      <QueryViewWaterfall query={query} Failure={Failure} pending={pending}>
        {children}
      </QueryViewWaterfall>
    </Suspense>
  );
}

function QueryViewWaterfall<A, E>({
  query,
  Failure,
  children,
  pending,
}: QueryProps<A, E> & {
  readonly children: (value: A) => ReactNode;
  readonly pending: ReactNode;
}) {
  const { result, refresh } = useWaterfallQuery(query);
  return (
    <QueryResult result={result} Failure={Failure} retry={refresh} pending={pending}>
      {children}
    </QueryResult>
  );
}

function StartedQueryBody<A, E>({
  source,
  handle,
  claim,
  Failure,
  children,
  pending,
}: {
  readonly source: StartedRead<A, E>["source"];
  readonly handle: StartedRead<A, E>["handle"];
  readonly claim: StartedRead<A, E>["claim"];
  readonly Failure: QueryProps<A, E>["Failure"];
  readonly children: (value: A) => ReactNode;
  readonly pending: ReactNode;
}) {
  const { result, refresh } = useStartedQuery({ source, handle });
  return (
    <ClaimResult source={source} result={result} claim={claim}>
      {(claimed) => (
        <QueryResult result={claimed} Failure={Failure} retry={refresh} pending={pending}>
          {children}
        </QueryResult>
      )}
    </ClaimResult>
  );
}

/** Read a handle the route loader started. Suspense covers the wait; claimed errors throw to their boundaries. */
export function StartedQueryView<A, E>({
  source,
  handle,
  claim,
  Failure,
  children,
  pending = <LoadingRows />,
}: {
  readonly source: StartedRead<A, E>["source"];
  readonly handle: StartedRead<A, E>["handle"];
  readonly claim?: StartedRead<A, E>["claim"];
  readonly Failure: QueryProps<A, E>["Failure"];
  readonly children: (value: A) => ReactNode;
  readonly pending?: ReactNode;
}) {
  return (
    <Suspense fallback={pending}>
      <StartedQueryBody
        source={source}
        handle={handle}
        claim={claim}
        Failure={Failure}
        pending={pending}
      >
        {children}
      </StartedQueryBody>
    </Suspense>
  );
}

type Results = Readonly<Record<string, AsyncResult.AsyncResult<unknown, unknown>>>;

/**
 * Several reads one view needs, as one read. It fails with the first failure, so a cause shared by
 * the reads, such as a removed app, is reported once. It keeps every read's last value while it
 * fails, so the view keeps its open dialogs and drafts.
 */
export const allResults = <const R extends Results>(
  results: R,
): AsyncResult.AsyncResult<
  { readonly [K in keyof R]: AsyncResult.AsyncResult.Success<R[K]> },
  AsyncResult.AsyncResult.Failure<R[keyof R]>
> => {
  const entries = Object.entries(results);
  const waiting = entries.some(([, result]) => result.waiting);
  const values = entries.flatMap(([key, result]) =>
    Option.match(AsyncResult.value(result), {
      onNone: () => [],
      onSome: (value) => [[key, value] as const],
    }),
  );
  // Every read has a value exactly when each entry produced one.
  const value =
    values.length === entries.length
      ? Option.some(
          Object.fromEntries(values) as {
            readonly [K in keyof R]: AsyncResult.AsyncResult.Success<R[K]>;
          },
        )
      : Option.none();
  const failed = entries.find(([, result]) => AsyncResult.isFailure(result));
  if (failed !== undefined && AsyncResult.isFailure(failed[1]))
    return AsyncResult.failure(
      failed[1].cause as Cause.Cause<AsyncResult.AsyncResult.Failure<R[keyof R]>>,
      {
        previousSuccess: Option.map(value, (current) => AsyncResult.success(current)),
        waiting,
      },
    );
  return Option.match(value, {
    onNone: () => AsyncResult.initial(waiting),
    onSome: (current) => AsyncResult.success(current, { waiting }),
  });
};

/** Render a query snapshot without subscribing again. Error and content retain separate React positions. */
export function QueryResult<A, E>({
  result,
  Failure,
  retry,
  children,
  pending = <LoadingRows />,
}: Omit<QueryProps<A, E>, "query"> & {
  readonly result: AsyncResult.AsyncResult<A, E>;
  readonly retry: () => void;
  readonly children: (value: A) => ReactNode;
  readonly pending?: ReactNode;
}) {
  const view = AsyncResult.match(result, {
    onInitial: () => ({ error: null, content: pending }),
    onSuccess: ({ value }) => ({ error: null, content: children(value) }),
    onFailure: (failure) => ({
      error: <Failure cause={failure.cause} retry={retry} retrying={failure.waiting} />,
      content: Option.match(AsyncResult.value(failure), {
        onNone: () => null,
        onSome: children,
      }),
    }),
  });
  // Keep the content in the same slot when an error appears or clears. Returning
  // a different fragment from each matcher branch can remount unkeyed children.
  return (
    <>
      {view.error}
      {view.content}
    </>
  );
}

/** Stable loading rows retain the eventual list footprint. */
export function LoadingRows({ count = 5 }: { readonly count?: number }) {
  return (
    <div
      className="loading-rows border border-border rounded-[8px] overflow-hidden min-h-90 [&_>_div]:flex [&_>_div]:items-center [&_>_div]:py-[22px] [&_>_div]:px-[18px] [&_>_div]:gap-3.75 [&_>_div]:border-b [&_>_div]:border-b-border [&_[data-slot='skeleton']]:block [&_[data-slot='skeleton']]:bg-accent [&_[data-slot='skeleton']]:rounded-[5px]"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <Skeleton className="skeleton-icon w-8.5 h-8.5 max-[740px]:shrink-0" />
          <Skeleton className="skeleton-copy w-45 h-3.25 max-[740px]:min-w-0" />
          <Skeleton className="skeleton-meta ml-auto w-22.5 h-2.5 max-[740px]:shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Start reads a component needs before it reads the first of them. On the server a render stops
 * at its first unresolved read, so reads that do not depend on each other would otherwise run one
 * after another. The browser already starts every read in the same render.
 */
export const usePreload = (...atoms: ReadonlyArray<Atom.Atom<unknown>>) => {
  const registry = useContext(RegistryContext);
  if (typeof window === "undefined") for (const atom of atoms) registry.mount(atom);
};
