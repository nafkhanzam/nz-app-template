import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  // PUBLIC_* is our own convention, not Vite's default VITE_* prefix.
  envPrefix: ["VITE_", "PUBLIC_"],
  plugins: [
    tailwindcss(),
    nodePolyfills({
      include: ["buffer"],
    }),
    sveltekit(),
  ],
});
