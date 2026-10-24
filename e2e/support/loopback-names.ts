/**
 * Chromium resolves every name under `.localhost` to loopback. Node's resolver does not on every
 * platform, and Playwright's API client uses that resolver, so an app host never answers.
 * Rewrite those requests onto 127.0.0.1 and keep the virtual host in the Host header. Page
 * navigations stay on the original name, which the browser resolves itself.
 */

type HeaderList = ReadonlyArray<{ readonly name: string; readonly value: string }>;
type HeaderMap = { readonly [key: string]: string };
type Headers = HeaderList | HeaderMap;
type FetchOptions = {
  readonly headers?: Headers;
  readonly [key: string]: unknown;
};
type Fetch = (this: unknown, urlOrRequest: unknown, options?: FetchOptions) => Promise<unknown>;

const loopbackName = (hostname: string) =>
  hostname === "localhost" || hostname.endsWith(".localhost");

const loopbackUrl = (url: string) => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (!loopbackName(parsed.hostname)) return undefined;
  const host = parsed.host;
  parsed.hostname = "127.0.0.1";
  return { url: parsed.href, host };
};

const namedHost = (headers: Headers) =>
  Array.isArray(headers)
    ? headers.some((entry) => entry.name.toLowerCase() === "host")
    : Object.keys(headers).some((name) => name.toLowerCase() === "host");

const withHost = (headers: Headers | undefined, host: string): Headers => {
  if (headers === undefined) return { host };
  if (namedHost(headers)) return headers;
  return Array.isArray(headers)
    ? [...headers, { name: "host", value: host }]
    : { ...headers, host };
};

let routed = false;

/** Patch every API client, including contexts a test opens later, without touching DNS. */
export const routeAppHostsToLoopback = (request: object) => {
  if (routed) return;
  const prototype = Object.getPrototypeOf(request) as { fetch?: Fetch };
  const fetch = prototype.fetch;
  if (fetch === undefined) return;
  routed = true;
  prototype.fetch = function (this: unknown, urlOrRequest, options = {}) {
    if (typeof urlOrRequest !== "string") return fetch.call(this, urlOrRequest, options);
    const loopback = loopbackUrl(urlOrRequest);
    if (loopback === undefined) return fetch.call(this, urlOrRequest, options);
    return fetch.call(this, loopback.url, {
      ...options,
      headers: withHost(options.headers, loopback.host),
    });
  };
};
