import adapter from "@sveltejs/adapter-static";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type Plugin } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Vite's dev server dies from SIGINT (reported as a failed script, e.g. by `pnpm prod`).
// Close it and exit 0 instead; force-exit if closing hangs.
const gracefulShutdown = (): Plugin => ({
  name: "graceful-shutdown",
  apply: "serve",
  configureServer(server) {
    let shuttingDown = false;
    const shutdown = (signal: NodeJS.Signals) => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      setTimeout(() => process.exit(1), 5_000).unref();
      server.close().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  },
});

export default defineConfig({
  plugins: [
    gracefulShutdown(),
    tailwindcss(),
    nodePolyfills({
      include: ["buffer"],
    }),
    sveltekit({
      adapter: adapter({
        pages: "build",
        assets: "build",
        fallback: "index.html",
        precompress: true,
        strict: true,
      }),
    }),
  ],
});
