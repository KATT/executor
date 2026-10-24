import { CloudLoginPage } from "../pages/login.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { sessionAtom } from "@executor-js/hosted-web/contracts/auth";
import { loginProps, loginSearch } from "@executor-js/hosted-web/pages/login";
import { AsyncResult } from "effect/reactivity";
import { Loader } from "raf-effect-atom";
import { passkeyEnrollmentAtom } from "../../contracts/passkey-enrollment.ts";

/** Each host mounts the same login UI on its own origin. */
export const Route = createFileRoute("/login")({
  codeSplitGroupings: [],
  validateSearch: (search) => ({
    ...loginSearch(search),
    ...(search.mode === "signup" ? { mode: "signup" as const } : {}),
  }),
  loader: async ({ context }) => {
    const session = await context.atoms.ensure(sessionAtom);
    const current = Loader.result(session);
    if (!AsyncResult.isSuccess(current) || current.value === null) return { enrollment: undefined };
    return {
      enrollment: context.atoms.prefetchInBrowser(passkeyEnrollmentAtom, current.value.user.id),
    };
  },
  component: () => {
    const search = Route.useSearch();
    return (
      <CloudLoginPage
        {...search}
        {...loginProps(search)}
        enrollment={Route.useLoaderData().enrollment}
      />
    );
  },
});
