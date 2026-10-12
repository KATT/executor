import { useMemo } from "react";
import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { McpServerMove } from "@executor-js/react/api/mcp-server-move";

import { v2ImportAtom } from "./auth";

// ---------------------------------------------------------------------------
// The selected org's MCP server in Executor v2, for the shared connect surfaces
// (`McpInstallCard`, the onboarding setup page). Set only for an org v2 has
// imported, and only where the server knows v2's MCP origin (`v2McpUrl`).
// ---------------------------------------------------------------------------

export function useV2McpMove(): McpServerMove | null {
  const result = useAtomValue(v2ImportAtom);
  const url = AsyncResult.isSuccess(result) ? result.value.moved?.v2McpUrl : undefined;
  return useMemo(
    () => (url === undefined ? null : { url, destination: "Executor v2", previous: "v1" }),
    [url],
  );
}
