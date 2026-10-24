/**
 * Chromium resolves every name under `.localhost` to loopback. Node's resolver does not on every
 * platform, and Playwright's API client uses that resolver, so an app host never answers.
 * Rewrite those requests onto 127.0.0.1, keep the virtual host in the Host header, and send the
 * cookies that belong to the original name. Playwright would otherwise match cookies to 127.0.0.1.
 * Page navigations stay on the original name, which the browser resolves itself.
 */

type HeaderList = ReadonlyArray<{ readonly name: string; readonly value: string }>;
type HeaderMap = { readonly [key: string]: string };
type Headers = HeaderList | HeaderMap;
type FetchOptions = {
  readonly headers?: Headers;
  readonly [key: string]: unknown;
};
type StoredCookie = {
  readonly name: string;
  readonly value: string;
  readonly domain: string;
  readonly path: string;
  readonly expires: number;
  readonly secure: boolean;
};
type RequestClient = {
  storageState: () => Promise<{ readonly cookies: ReadonlyArray<StoredCookie> }>;
};
type Fetch = (
  this: RequestClient,
  urlOrRequest: unknown,
  options?: FetchOptions,
) => Promise<unknown>;

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
  return { url: parsed.href, host, original: new URL(url) };
};

const hasHeader = (headers: Headers, name: string) =>
  Array.isArray(headers)
    ? headers.some((entry) => entry.name.toLowerCase() === name)
    : Object.keys(headers).some((key) => key.toLowerCase() === name);

const withHeader = (headers: Headers | undefined, name: string, value: string): Headers => {
  if (headers === undefined) return { [name]: value };
  if (hasHeader(headers, name)) return headers;
  return Array.isArray(headers) ? [...headers, { name, value }] : { ...headers, [name]: value };
};

const domainMatches = (hostname: string, domain: string) =>
  hostname === domain || (domain.startsWith(".") && `.${hostname}`.endsWith(domain));

const pathMatches = (pathname: string, cookiePath: string) => {
  if (pathname === cookiePath) return true;
  const requestPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const prefix = cookiePath.endsWith("/") ? cookiePath : `${cookiePath}/`;
  return requestPath.startsWith(prefix);
};

/** The same match Playwright uses when it fills a Cookie header from the context. */
const cookieMatches = (cookie: StoredCookie, url: URL) => {
  if (cookie.secure && url.protocol !== "https:" && !loopbackName(url.hostname)) return false;
  if (cookie.expires !== -1 && cookie.expires * 1000 < Date.now()) return false;
  return domainMatches(url.hostname, cookie.domain) && pathMatches(url.pathname, cookie.path);
};

const cookieHeader = (cookies: ReadonlyArray<StoredCookie>, url: URL) =>
  cookies
    .filter((cookie) => cookieMatches(cookie, url))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

let routed = false;

/** Patch every API client, including contexts a test opens later, without touching DNS. */
export const routeAppHostsToLoopback = (request: RequestClient) => {
  if (routed) return;
  const prototype = Object.getPrototypeOf(request) as { fetch?: Fetch };
  const fetch = prototype.fetch;
  if (fetch === undefined) return;
  routed = true;
  prototype.fetch = function (this: RequestClient, urlOrRequest, options = {}) {
    if (typeof urlOrRequest !== "string") return fetch.call(this, urlOrRequest, options);
    const loopback = loopbackUrl(urlOrRequest);
    if (loopback === undefined) return fetch.call(this, urlOrRequest, options);
    const headers = withHeader(options.headers, "host", loopback.host);
    if (hasHeader(headers, "cookie"))
      return fetch.call(this, loopback.url, { ...options, headers });
    return this.storageState().then((state) =>
      fetch.call(this, loopback.url, {
        ...options,
        headers: withHeader(headers, "cookie", cookieHeader(state.cookies, loopback.original)),
      }),
    );
  };
};
