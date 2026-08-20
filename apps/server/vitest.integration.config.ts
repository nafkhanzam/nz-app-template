import { defineConfig } from "vitest/config";

// Separate from vitest.config.ts (not just a narrower `include`) so a bare
// `vitest`/IDE run never picks up tests that need a live Garage instance —
// Vitest ANDs a CLI path filter with `include`, so passing `tests/integration`
// against the unit config's include would just match nothing, not opt in.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
