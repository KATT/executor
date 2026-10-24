/** Cloud role hosts, observed only through HTTP. No product code is imported. */
import { request as httpRequest, type IncomingMessage } from "node:http";
import { Effect } from "effect";
import { driver, type Target } from "./platform.ts";

/**
 * The origin of a role host beside a Cloud deployment origin. Local Clouds and test stages put it
 * at `<role>.<deployment host>`: `http://mcp.localhost:4411`, `https://mcp.<slug>.executor.engineering`.
 * `edge` stands in for `executor.sh`, which v1's edge forwards to v2 from.
 */
export const roleHost = (origin: string, role: "app" | "mcp" | "api" | "edge") => {
  const url = new URL(origin);
  url.hostname = `${role}.${url.hostname}`;
  return url.origin;
};

/**
 * Where a target serves each part of the product. A run's `origin` is the deployment origin
 * (`v2.executor.sh`'s place). Every Cloud target has role hosts, so its dashboard and sign-in are
 * on `app.`, or on the deployment origin under the rollback switch (`e2e:cloud --rollback`); the
 * canonical MCP and API resources are on `mcp.` and `api.`. Other targets serve everything on one
 * origin.
 */
export const targetHosts = (target: typeof Target.Service) => {
  const origin = target.metadata.origin;
  if (target.metadata.target !== "cloud")
    return { deployment: origin, browser: origin, mcp: origin, api: origin, edge: origin };
  return {
    deployment: origin,
    browser: target.metadata.browserOrigin === "deployment" ? origin : roleHost(origin, "app"),
    mcp: roleHost(origin, "mcp"),
    api: roleHost(origin, "api"),
    edge: roleHost(origin, "edge"),
  };
};

/** MCP endpoints and their resource discovery, which Cloud never serves on its browser origin. */
export const isMcpPath = (pathname: string) =>
  pathname === "/mcp" ||
  /^\/org\/[^/]+\/mcp$/.test(pathname) ||
  pathname.startsWith("/.well-known/oauth-protected-resource");

const loopbackName = (hostname: string) =>
  hostname === "localhost" || hostname.endsWith(".localhost");

const headerRecord = (message: IncomingMessage) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(message.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const item of value) headers.append(key, item);
    else headers.append(key, value);
  }
  return headers;
};

/**
 * Node's resolver does not map `*.localhost` to loopback on every platform, and `fetch` refuses a
 * Host header. Ask 127.0.0.1 and name the virtual host ourselves.
 */
const loopbackRequest = (url: string, init: RequestInit, signal: AbortSignal) =>
  new Promise<{ readonly status: number; readonly headers: Headers; readonly text: string }>(
    (resolve, reject) => {
      const parsed = new URL(url);
      const headers = new Headers(init.headers);
      const outgoing: Record<string, string> = { host: parsed.host };
      headers.forEach((value, key) => {
        if (key !== "host") outgoing[key] = value;
      });
      const req = httpRequest(
        {
          hostname: "127.0.0.1",
          port: parsed.port === "" ? 80 : Number(parsed.port),
          path: `${parsed.pathname}${parsed.search}`,
          method: init.method ?? "GET",
          headers: outgoing,
          signal,
        },
        (message) => {
          const chunks: Array<Buffer> = [];
          message.on("data", (chunk: Buffer) => chunks.push(chunk));
          message.on("end", () =>
            resolve({
              status: message.statusCode ?? 0,
              headers: headerRecord(message),
              text: Buffer.concat(chunks).toString("utf8"),
            }),
          );
          message.on("error", reject);
        },
      );
      req.on("error", reject);
      const body = init.body;
      if (typeof body === "string" || body instanceof Uint8Array) req.write(body);
      else if (body instanceof URLSearchParams) req.write(body.toString());
      else if (body != null) {
        reject(new Error("A loopback request can send text or bytes only"));
        return;
      }
      req.end();
    },
  );

const described = (status: number, headers: Headers, text: string) => ({
  status,
  location: headers.get("location"),
  cacheControl: headers.get("cache-control"),
  contentType: headers.get("content-type"),
  challenge: headers.get("www-authenticate"),
  setCookies: headers.getSetCookie(),
  allowOrigin: headers.get("access-control-allow-origin"),
  allowMethods: headers.get("access-control-allow-methods"),
  text,
});

/** One request without following redirects; only its status, chosen headers and body text. */
export const rawRequest = (url: string, init: RequestInit = {}) => {
  const target = new URL(url);
  const operation = `${init.method ?? "GET"} ${target.host}${target.pathname}`;
  if (target.protocol === "http:" && loopbackName(target.hostname))
    return driver(operation, (signal) => loopbackRequest(url, init, signal)).pipe(
      Effect.map((response) => described(response.status, response.headers, response.text)),
    );
  return driver(operation, (signal) => fetch(url, { ...init, redirect: "manual", signal })).pipe(
    Effect.flatMap((response) =>
      driver(`read ${operation}`, () => response.text()).pipe(
        Effect.map((text) => described(response.status, response.headers, text)),
      ),
    ),
  );
};
