// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const postgresClientStub = path.resolve(rootDir, "src/lib/stubs/postgres-client-stub.ts");

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      {
        name: "postgres-client-stub",
        /** Dev SSR must use the real driver; only the browser bundle gets the stub. */
        resolveId(source, _importer, options) {
          if (source !== "postgres") return;
          if (options.ssr) return;
          return postgresClientStub;
        },
        config(_config, { command, isSsrBuild }) {
          if (command !== "build" || isSsrBuild) return;
          return {
            resolve: {
              alias: { postgres: postgresClientStub },
            },
          };
        },
      },
    ],
  },
});
