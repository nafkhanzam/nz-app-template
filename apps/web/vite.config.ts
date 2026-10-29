import adapter from "@sveltejs/adapter-static";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
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
