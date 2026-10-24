import { Suspense, type ComponentType, type ReactNode } from "react";
import { EmptyState } from "./empty-state.tsx";
import { OverviewCatalog } from "./overview-catalog.tsx";
import type { App, AppSkillCatalog, HostedWorkflow } from "@executor-js/sdk";
import type { SkillBindings } from "../../contracts/app-browser.ts";
import type { FailureProps, Query } from "../../contracts/dashboard.ts";
import type { StartedRead } from "../../contracts/started-read.ts";
import { QueryResult, QueryView, useDashboard, useStartedQuery } from "./context.tsx";
import { OverviewCardLoading } from "./app-loading.tsx";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";

/** Preview the actual skills and workflow descriptions, with entry points to their full views. */
export function AppOverviewEntries<E>({
  app,
  bindings,
  Failure,
  workflows,
  skillsRead,
}: {
  readonly app: App;
  readonly bindings: SkillBindings<E>;
  readonly workflows: ReactNode;
  readonly Failure: ComponentType<FailureProps<E>>;
  readonly skillsRead?: StartedRead<AppSkillCatalog, E> | undefined;
}) {
  return (
    <>
      <section
        className="flex h-60 min-w-0 flex-col overflow-hidden rounded-lg border bg-background p-5 max-[740px]:p-4"
        aria-label="App skills preview"
      >
        <EntryHeader app={app} view="skills" label="Skills" />
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {app.activeVersion === null ? (
            <EmptyState size="card" heading="h3" title="No version yet">
              Deploy this app to view its skills.
            </EmptyState>
          ) : (
            <QueryView
              query={bindings.skills}
              {...(skillsRead === undefined ? {} : { read: skillsRead })}
              Failure={Failure}
              pending={<OverviewCardLoading label="Loading skills preview" descriptionLines={2} />}
            >
              {(catalog) => <EntryList items={catalog.skills} empty="No skills yet" />}
            </QueryView>
          )}
        </div>
      </section>
      <section
        className="flex h-60 min-w-0 flex-col overflow-hidden rounded-lg border bg-background p-5 max-[740px]:p-4"
        aria-label="App workflows preview"
      >
        <EntryHeader app={app} view="workflows" label="Workflows" />
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {app.activeVersion === null ? (
            <EmptyState size="card" heading="h3" title="No version yet">
              Deploy this app to view its workflows.
            </EmptyState>
          ) : (
            workflows
          )}
        </div>
      </section>
    </>
  );
}
/** Workflow descriptions appear once across the available account catalogs. */
export function AppWorkflowPreview<E, A extends readonly HostedWorkflow[]>({
  sources,
  read,
  Failure,
  empty,
}: {
  readonly sources: readonly {
    readonly key: string;
    readonly query: Query<A, E>;
  }[];
  /** The one catalog the route loader started. */
  readonly read?: StartedRead<A, E> | undefined;
  readonly Failure: ComponentType<FailureProps<E>>;
  readonly empty: ReactNode;
}) {
  if (sources.length === 0) return empty;
  if (read !== undefined && sources.length === 1)
    return (
      <Suspense fallback={<OverviewCardLoading label="Loading workflows preview" />}>
        <StartedPreview
          read={read}
          items={(workflows) => workflows}
          Failure={Failure}
          label="Loading workflows preview"
          empty={<p className="py-5 text-sm text-muted-foreground">This app has no workflows.</p>}
        >
          {(workflows) => <EntryList items={workflows} empty="This app has no workflows." />}
        </StartedPreview>
      </Suspense>
    );
  return (
    <OverviewCatalog
      sources={sources}
      {...(read === undefined ? {} : { started: read })}
      items={(workflows) => workflows}
      Failure={Failure}
      label="Loading workflows preview"
      empty={<p className="py-5 text-sm text-muted-foreground">This app has no workflows.</p>}
    >
      {(workflows) => <EntryList items={workflows} empty="This app has no workflows." />}
    </OverviewCatalog>
  );
}
function EntryHeader({
  app,
  view,
  label,
}: {
  readonly app: App;
  readonly view: "skills" | "workflows";
  readonly label: string;
}) {
  const { AppLink } = useDashboard();
  return (
    <div className="mb-1 flex min-h-9 shrink-0 items-center justify-between gap-3 border-b pb-3">
      <h3 className="text-sm font-medium">{label}</h3>
      {app.activeVersion !== null && (
        <AppLink
          app={app.id}
          view={view}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          View all <HugeiconsIcon icon={ArrowRight02Icon} size={13} aria-hidden />
        </AppLink>
      )}
    </div>
  );
}
export function StartedPreview<A, E, Item extends { readonly name: string }>({
  read,
  items,
  Failure,
  label,
  empty,
  children,
}: {
  readonly read: StartedRead<A, E>;
  readonly items: (value: A) => readonly Item[];
  readonly Failure: ComponentType<FailureProps<E>>;
  readonly label: string;
  readonly empty: ReactNode;
  readonly children: (entries: readonly Item[]) => ReactNode;
}) {
  const { result, refresh } = useStartedQuery(read);
  return (
    <QueryResult
      result={result}
      Failure={Failure}
      retry={refresh}
      pending={<OverviewCardLoading label={label} />}
    >
      {(value) => {
        const entries = items(value);
        return entries.length === 0 ? empty : children(entries);
      }}
    </QueryResult>
  );
}
function EntryList({
  items,
  empty,
}: {
  readonly items: readonly { readonly name: string; readonly description?: string }[];
  readonly empty: string;
}) {
  if (items.length === 0) return <EmptyState size="card" heading="h3" title={empty} />;
  return (
    <ul className="divide-y">
      {items.slice(0, 4).map((item) => (
        <li key={item.name} className="py-3.5">
          <p className="truncate text-sm font-medium" title={item.name}>
            {item.name}
          </p>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {item.description}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
