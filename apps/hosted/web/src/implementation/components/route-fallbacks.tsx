import { useRefetchHeldDefects } from "@executor-js/dashboard-start/refetch-defects";
import { EmptyState } from "@executor-js/ui/dashboard/empty-state";
import { Link, type ErrorComponentProps } from "@tanstack/react-router";

/** Common missing-page UI; the host's router determines when to render it. */
export function PageNotFound() {
  return (
    <section className="page w-full shrink-0 max-w-315 [padding:24px_24px_48px] my-0 mx-auto max-[1000px]:[padding:20px_20px_40px] max-[740px]:[padding:18px_max(16px,_env(safe-area-inset-right))_max(32px,_env(safe-area-inset-bottom))_max(16px,_env(safe-area-inset-left))]">
      <EmptyState
        title="Page not found"
        heading="h1"
        icon={null}
        action={
          <Link className="text-sm underline underline-offset-4" to="/">
            Choose organization
          </Link>
        }
      />
    </section>
  );
}

/** A defect from a page read. Retry fetches the atoms again; `ensure` would return the same defect. */
export function PageError({ reset }: ErrorComponentProps) {
  const { retry, retrying } = useRefetchHeldDefects(reset);
  return (
    <section className="page w-full shrink-0 max-w-315 [padding:24px_24px_48px] my-0 mx-auto max-[1000px]:[padding:20px_20px_40px] max-[740px]:[padding:18px_max(16px,_env(safe-area-inset-right))_max(32px,_env(safe-area-inset-bottom))_max(16px,_env(safe-area-inset-left))]">
      <EmptyState
        title="This page couldn’t load"
        heading="h1"
        icon={null}
        role="alert"
        action={
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              className="text-sm underline underline-offset-4 disabled:opacity-60 max-[740px]:inline-flex max-[740px]:min-h-11 max-[740px]:items-center"
              onClick={retry}
              disabled={retrying}
            >
              Try again
            </button>
            <a className="text-sm underline underline-offset-4" href="/">
              Choose organization
            </a>
          </div>
        }
      >
        Check your connection, then try again.
      </EmptyState>
    </section>
  );
}
