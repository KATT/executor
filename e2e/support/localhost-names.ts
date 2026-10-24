/**
 * Chromium resolves every name under `.localhost` to loopback. Node's resolver does not on
 * every platform, and Playwright's API client uses that resolver, so an app host never answers.
 * Give those names the same loopback address the browser would.
 */
import nodeDns from "node:dns";

const originalLookup = nodeDns.promises.lookup.bind(nodeDns.promises);
const loopbackName = (hostname: string) =>
  hostname === "localhost" || hostname.endsWith(".localhost");

nodeDns.promises.lookup = ((hostname: string, options?: unknown) => {
  if (!loopbackName(hostname)) return originalLookup(hostname, options as never);
  const record = options !== null && typeof options === "object" ? options : {};
  const requested =
    "family" in record && (record.family === 4 || record.family === 6) ? record.family : 4;
  const entry =
    requested === 6
      ? { address: "::1", family: 6 as const }
      : { address: "127.0.0.1", family: 4 as const };
  return Promise.resolve("all" in record && record.all === true ? [entry] : entry);
}) as typeof nodeDns.promises.lookup;
