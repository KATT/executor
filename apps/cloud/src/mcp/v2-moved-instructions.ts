// ---------------------------------------------------------------------------
// What a moved organization's MCP sessions tell the connected agent.
//
// An organization v2 has imported keeps working in v1, MCP included, so an
// agent connected here would never learn it moved. Its sessions carry MCP
// server `instructions` saying where the org's MCP server is now. Tools behave
// exactly as before.
//
// The move is read once per session build (an `initialize`, or a cold restore
// of an evicted session), never per request, and in parallel with the
// execution stack. The read is bounded: a slow or failing WorkOS answers "not
// moved", so it can neither fail nor stall a session.
// ---------------------------------------------------------------------------

import { Effect } from "effect";

import { v2AppOrigin, v2McpOrigin, type V2MovedEnv } from "../auth/v2-import";
import { liveV2MovedSource, v2Moved, type V2Moved } from "../auth/v2-moved";
import type { WorkOSClient } from "../auth/workos";

/** Longest the move read may add to a session build. */
export const V2_MOVED_READ_TIMEOUT_MS = 1_000;

const movedDate = (movedAt: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(movedAt));

/** The instructions for a moved org, or `null` without a v2 MCP URL. */
export const v2MovedInstructionsText = (moved: V2Moved): string | null =>
  moved.v2McpUrl === undefined
    ? null
    : `This organization moved to Executor v2 on ${movedDate(moved.movedAt)}. ` +
      `Its MCP server is now ${moved.v2McpUrl}; ask the user to reconnect their agent there. ` +
      "Changes made through this server won't reach v2.";

/** The session's instructions when its organization has moved to v2 and v1
 *  knows v2's MCP origin; otherwise `undefined`. Never fails. */
export const v2MovedMcpInstructions = (
  env: V2MovedEnv,
  organizationId: string,
): Effect.Effect<string | undefined, never, WorkOSClient> =>
  Effect.gen(function* () {
    const appOrigin = v2AppOrigin(env);
    const mcpOrigin = v2McpOrigin(env);
    if (appOrigin === null || mcpOrigin === null) return undefined;
    const moved = yield* v2Moved(yield* liveV2MovedSource, organizationId, appOrigin, mcpOrigin);
    return (moved === null ? null : v2MovedInstructionsText(moved)) ?? undefined;
  }).pipe(
    Effect.timeoutOrElse({
      duration: `${V2_MOVED_READ_TIMEOUT_MS} millis`,
      orElse: () => Effect.succeed(undefined),
    }),
    Effect.withSpan("mcp.session.v2_moved_instructions"),
  );
