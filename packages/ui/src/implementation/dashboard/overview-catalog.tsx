import { Suspense, type ComponentType, type ReactNode } from "react";
import { useAtomRefresh } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult, type Atom } from "effect/reactivity";
import { useAtomResult, useWaterfall, type Handle } from "raf-effect-atom";
import type { FailureProps, Query } from "../../contracts/dashboard.ts";
import type { StartedRead } from "../../contracts/started-read.ts";
import { OverviewCardLoading } from "./app-loading.tsx";

/** Summarize live catalogs once by name; execution stays in the account-specific tabs. */
export function OverviewCatalog<A, E, Item extends { readonly name: string }>({
  sources,
  started,
  items,
  children,
  empty,
  label,
  Failure,
}: {
  readonly sources: readonly { readonly key: string; readonly query: Query<A, E> }[];
  /** The catalog the route loader started, when this card shows that query among others. */
  readonly started?: StartedRead<A, E> | undefined;
  readonly items: (value: A) => readonly Item[];
  readonly children: (entries: readonly Item[]) => ReactNode;
  readonly empty: ReactNode;
  readonly label: string;
  readonly Failure: ComponentType<FailureProps<E>>;
}) {
  return (
    <Suspense fallback={<OverviewCardLoading label={label} />}>
      <CatalogHandles
        sources={sources}
        started={started}
        index={0}
        handles={[]}
        items={items}
        empty={empty}
        label={label}
        Failure={Failure}
      >
        {children}
      </CatalogHandles>
    </Suspense>
  );
}

interface CatalogHandle<A, E> {
  readonly key: string;
  readonly query: Query<A, E>;
  readonly handle: Handle<Atom.Atom<AsyncResult.AsyncResult<A, unknown>>>;
}

/**
 * Start every catalog before any of them suspends. Each level is one source, so the hooks stay
 * stable while the requests run together.
 */
function CatalogHandles<A, E, Item extends { readonly name: string }>({
  sources,
  started,
  index,
  handles,
  items,
  children,
  empty,
  label,
  Failure,
}: {
  readonly sources: readonly { readonly key: string; readonly query: Query<A, E> }[];
  readonly started: StartedRead<A, E> | undefined;
  readonly index: number;
  readonly handles: readonly CatalogHandle<A, E>[];
  readonly items: (value: A) => readonly Item[];
  readonly children: (entries: readonly Item[]) => ReactNode;
  readonly empty: ReactNode;
  readonly label: string;
  readonly Failure: ComponentType<FailureProps<E>>;
}) {
  const source = sources[index];
  if (source === undefined)
    return (
      <CatalogResults
        reads={handles}
        index={0}
        found={[]}
        items={items}
        empty={empty}
        label={label}
        Failure={Failure}
      >
        {children}
      </CatalogResults>
    );
  return (
    <CatalogHandleLevel
      source={source}
      sources={sources}
      started={started}
      index={index}
      handles={handles}
      items={items}
      empty={empty}
      label={label}
      Failure={Failure}
    >
      {children}
    </CatalogHandleLevel>
  );
}

function CatalogHandleLevel<A, E, Item extends { readonly name: string }>({
  source,
  sources,
  started,
  index,
  handles,
  items,
  children,
  empty,
  label,
  Failure,
}: {
  readonly source: { readonly key: string; readonly query: Query<A, E> };
  readonly sources: readonly { readonly key: string; readonly query: Query<A, E> }[];
  readonly started: StartedRead<A, E> | undefined;
  readonly index: number;
  readonly handles: readonly CatalogHandle<A, E>[];
  readonly items: (value: A) => readonly Item[];
  readonly children: (entries: readonly Item[]) => ReactNode;
  readonly empty: ReactNode;
  readonly label: string;
  readonly Failure: ComponentType<FailureProps<E>>;
}) {
  const waterfall = useWaterfall(source.query);
  const handle =
    started !== undefined && started.source === source.query ? started.handle : waterfall;
  return (
    <CatalogHandles
      sources={sources}
      started={started}
      index={index + 1}
      handles={[...handles, { key: source.key, query: source.query, handle }]}
      items={items}
      empty={empty}
      label={label}
      Failure={Failure}
    >
      {children}
    </CatalogHandles>
  );
}

interface SettledCatalog<A, E> {
  readonly key: string;
  readonly result: AsyncResult.AsyncResult<A, E>;
  readonly retry: () => void;
}

function CatalogResults<A, E, Item extends { readonly name: string }>({
  reads,
  index,
  found,
  items,
  children,
  empty,
  label,
  Failure,
}: {
  readonly reads: readonly CatalogHandle<A, E>[];
  readonly index: number;
  readonly found: readonly SettledCatalog<A, E>[];
  readonly items: (value: A) => readonly Item[];
  readonly children: (entries: readonly Item[]) => ReactNode;
  readonly empty: ReactNode;
  readonly label: string;
  readonly Failure: ComponentType<FailureProps<E>>;
}) {
  const current = reads[index];
  if (current === undefined)
    return (
      <CatalogBody found={found} items={items} empty={empty} label={label} Failure={Failure}>
        {children}
      </CatalogBody>
    );
  return (
    <CatalogResultLevel
      current={current}
      reads={reads}
      index={index}
      found={found}
      items={items}
      empty={empty}
      label={label}
      Failure={Failure}
    >
      {children}
    </CatalogResultLevel>
  );
}

function CatalogResultLevel<A, E, Item extends { readonly name: string }>({
  current,
  reads,
  index,
  found,
  items,
  children,
  empty,
  label,
  Failure,
}: {
  readonly current: CatalogHandle<A, E>;
  readonly reads: readonly CatalogHandle<A, E>[];
  readonly index: number;
  readonly found: readonly SettledCatalog<A, E>[];
  readonly items: (value: A) => readonly Item[];
  readonly children: (entries: readonly Item[]) => ReactNode;
  readonly empty: ReactNode;
  readonly label: string;
  readonly Failure: ComponentType<FailureProps<E>>;
}) {
  const result = useAtomResult(current.query, current.handle);
  const retry = useAtomRefresh(current.query);
  return (
    <CatalogResults
      reads={reads}
      index={index + 1}
      found={[...found, { key: current.key, result, retry }]}
      items={items}
      empty={empty}
      label={label}
      Failure={Failure}
    >
      {children}
    </CatalogResults>
  );
}

function CatalogBody<A, E, Item extends { readonly name: string }>({
  found,
  items,
  children,
  empty,
  label,
  Failure,
}: {
  readonly found: readonly SettledCatalog<A, E>[];
  readonly items: (value: A) => readonly Item[];
  readonly children: (entries: readonly Item[]) => ReactNode;
  readonly empty: ReactNode;
  readonly label: string;
  readonly Failure: ComponentType<FailureProps<E>>;
}) {
  const entries = new Map<string, Item>();
  for (const { result } of found) {
    const value = AsyncResult.value(result);
    if (Option.isSome(value))
      for (const item of items(value.value))
        if (!entries.has(item.name)) entries.set(item.name, item);
  }
  const loading = found.some(({ result }) => AsyncResult.isInitial(result));
  const failed = found.some(({ result }) => AsyncResult.isFailure(result));
  return (
    <>
      {found.map(({ key, result, retry }) =>
        AsyncResult.isFailure(result) ? (
          <Failure key={key} cause={result.cause} retry={retry} retrying={result.waiting} />
        ) : null,
      )}
      {entries.size > 0 ? (
        children([...entries.values()].sort((a, b) => a.name.localeCompare(b.name)))
      ) : loading ? (
        <OverviewCardLoading label={label} />
      ) : failed ? null : (
        empty
      )}
    </>
  );
}
