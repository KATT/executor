/** Shared build tooling. Each dashboard supplies its own root, routes, and API target. */
import { fileURLToPath } from "node:url";
import { dashboardStartPlugins } from "@executor-js/dashboard-start/vite";
import { defineConfig } from "vite-plus";

/** Configure a host's dashboard without importing another host's frontend. */
export const dashboardViteConfig = ({
  apiUrl,
  port,
}: {
  readonly apiUrl: string;
  readonly port: number;
}) =>
  defineConfig({
    publicDir: fileURLToPath(new URL("./public", import.meta.url)),
    plugins: dashboardStartPlugins({
      runtime: "workerd",
      router: {
        codeSplittingOptions: {
          splitBehavior: ({ routeId }) => (routeId === "/org/$organizationSlug" ? [] : undefined),
        },
      },
    }),
    build: {
      rolldownOptions: {
        output: {
          // Each route file is its own startup chunk, and the lazy component chunk uses the same
          // route name. A navigation hold on that name would also hold the document's script.
          // Startup chunks get a different name; the lazy component keeps the route name.
          chunkFileNames: (chunk: { readonly name: string; readonly isDynamicEntry: boolean }) =>
            !chunk.isDynamicEntry && chunk.name.startsWith("org._")
              ? "assets/startup-[name]-[hash].js"
              : "assets/[name]-[hash].js",
        },
      },
    },
    server: {
      host: "127.0.0.1",
      port: process.env.PORT === undefined ? port : Number(process.env.PORT),
      strictPort: true,
      proxy: {
        "/api": apiUrl,
        "/health": apiUrl,
        "/openapi.json": apiUrl,
        "^/mcp$": apiUrl,
        "^/org/[^/]+/mcp$": apiUrl,
        "/.well-known": apiUrl,
      },
    },
  });
