import { useRefetchHeldDefects } from "@executor-js/dashboard-start/refetch-defects";
import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { Empty } from "./common.tsx";

/** Missing or malformed routes have a safe destination in the dashboard. */
export function NotFoundPage() {
  return (
    <Empty title="Page not found">
      <Link to="/apps">Return to Apps</Link>
    </Empty>
  );
}

/** A defect from a page read. Retry fetches the atoms again; `ensure` would return the same defect. */
export function PageError({ reset }: ErrorComponentProps) {
  const { retry, retrying } = useRefetchHeldDefects(reset);
  return (
    <Empty
      title="This page couldn’t load"
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
          <Link to="/apps">Return to Apps</Link>
        </div>
      }
    >
      Check that Executor is running, then try again.
    </Empty>
  );
}
