/**
 * Chromium resolves every name under `.localhost` to loopback. Node's resolver does not on every
 * platform, and Playwright's API client uses that resolver, so an app host never answers.
 * Rewrite those requests onto 127.0.0.1, keep the virtual host in the Host header, and send the
 * cookies that belong to the original name. Playwright would otherwise match cookies to 127.0.0.1.
 * Page navigations stay on the original name, which the browser resolves itself.
 */
import { request as httpRequest } from "node:http";

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

/**
 * Effect's HTTP client uses Node's fetch, which resolves names itself. Send `*.localhost` to
 * loopback and keep the virtual host, the same way an API client does, without a DNS override.
 */
export const routeNodeFetchToLoopback = () => {
  if (nodeFetchRouted) return;
  nodeFetchRouted = true;
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input instanceof Request
            ? input.url
            : undefined;
    if (url === undefined || !loopbackHttp(url)) return nativeFetch(input, init);
    const request = input instanceof Request ? input : undefined;
    const method = init?.method ?? request?.method ?? "GET";
    const headers = new Headers(request?.headers);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    return bodyBytes(init?.body).then((bytes) =>
      loopbackFetch(url, method, headers, bytes, init?.redirect ?? "follow", init?.signal, 0),
    );
  };
};

let nodeFetchRouted = false;

const loopbackHttp = (url: string) => {
  const parsed = loopbackUrl(url);
  return parsed !== undefined && new URL(url).protocol === "http:";
};

const bodyBytes = (body: BodyInit | null | undefined): Promise<Uint8Array | undefined> => {
  if (body == null) return Promise.resolve(undefined);
  if (typeof body === "string") return Promise.resolve(new TextEncoder().encode(body));
  if (body instanceof URLSearchParams)
    return Promise.resolve(new TextEncoder().encode(body.toString()));
  if (body instanceof Uint8Array) return Promise.resolve(body);
  if (body instanceof ArrayBuffer) return Promise.resolve(new Uint8Array(body));
  if (body instanceof Blob) return body.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  return Promise.reject(new Error("A loopback request can send text or bytes only"));
};

const loopbackFetch = (
  url: string,
  method: string,
  headers: { forEach: (callback: (value: string, key: string) => void) => void },
  body: Uint8Array | undefined,
  redirect: RequestRedirect,
  signal: AbortSignal | null | undefined,
  hops: number,
): Promise<Response> =>
  new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const outgoing: Record<string, string> = { host: parsed.host };
    headers.forEach((value, key) => {
      if (key !== "host") outgoing[key] = value;
    });
    const req = httpRequest(
      {
        hostname: "127.0.0.1",
        port: parsed.port === "" ? 80 : Number(parsed.port),
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: outgoing,
        signal: signal ?? undefined,
      },
      (message) => {
        const chunks: Array<Buffer> = [];
        message.on("data", (chunk: Buffer) => chunks.push(chunk));
        message.on("end", () => {
          const responseHeaders = new Headers();
          for (const [key, value] of Object.entries(message.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) for (const item of value) responseHeaders.append(key, item);
            else responseHeaders.append(key, value);
          }
          const response = new Response(Buffer.concat(chunks), {
            status: message.statusCode ?? 0,
            headers: responseHeaders,
          });
          if (
            redirect === "manual" ||
            hops >= 5 ||
            ![301, 302, 303, 307, 308].includes(response.status)
          ) {
            resolve(response);
            return;
          }
          const location = response.headers.get("location");
          if (location === null) {
            resolve(response);
            return;
          }
          const next = new URL(location, url).href;
          if (!loopbackHttp(next)) {
            resolve(response);
            return;
          }
          const nextMethod = response.status === 307 || response.status === 308 ? method : "GET";
          loopbackFetch(
            next,
            nextMethod,
            headers,
            nextMethod === method ? body : undefined,
            redirect,
            signal,
            hops + 1,
          ).then(resolve, reject);
        });
        message.on("error", reject);
      },
    );
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });

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
