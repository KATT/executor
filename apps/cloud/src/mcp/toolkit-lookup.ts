// ---------------------------------------------------------------------------
// Resolving a toolkit URL's slug to the toolkit's row id, for forwarding.
//
// Toolkits live in plugin storage (`@executor-js/plugin-toolkits`), owned by the
// org or by a single user. This reads them the way the v1 session does: through
// an executor scoped to the caller and org, so the caller sees the org's
// toolkits plus their own personal ones and nobody else's. The executor is
// built with the toolkits plugin alone, because a forwarded request has no use
// for the rest of the catalog. Among the rows with the slug the org's toolkit
// wins over the caller's own, as in the plugin's own slug resolution
// (`getBySlugEntry`).
// ---------------------------------------------------------------------------

import { Effect, Layer } from "effect";

import { PluginsProvider, makeScopedExecutor } from "@executor-js/api/server";
import { toolkitsPlugin } from "@executor-js/plugin-toolkits/server";

import { CloudDbProvider, CloudHostConfig } from "../engine/execution-stack";
import { makeDbLayer } from "../db/db";

const toolkitsOnly = Layer.succeed(PluginsProvider)({ plugins: () => [toolkitsPlugin()] });

export const resolveToolkitRowId = (
  organizationId: string,
  accountId: string,
  slug: string,
): Promise<string | null> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const executor = yield* makeScopedExecutor<readonly [ReturnType<typeof toolkitsPlugin>]>(
        accountId,
        organizationId,
        "",
      );
      const toolkits = yield* executor.toolkits.list();
      const matches = toolkits.filter((toolkit) => toolkit.slug === slug);
      return (matches.find((toolkit) => toolkit.owner === "org") ?? matches[0])?.id ?? null;
    }).pipe(
      Effect.provide(Layer.mergeAll(CloudDbProvider, toolkitsOnly, CloudHostConfig)),
      Effect.provide(makeDbLayer()),
      Effect.scoped,
    ),
  );
