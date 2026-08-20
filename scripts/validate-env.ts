#!/usr/bin/env -S pnpm exec tsx
// Validates a .env file against the same Zod schema the server uses at boot,
// so CI/deploy catches a missing or malformed key before the container ever
// starts — one schema, not a separate template list that can drift (§2.3).
//
// Usage: pnpm exec tsx scripts/validate-env.ts <path-to-.env>
//
// Note: this parses the file as plain KEY=VALUE pairs and does not run
// dotenv-expand. $VAR references (e.g. $APP_NAME) are resolved by the
// server itself at boot from the full merged environment, which this script
// does not have — it validates the file's own shape, not the expanded result.
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { parseEnv } from "../apps/server/src/env-schema.js";
// Same zod instance env-schema.ts itself uses (root's zod is a different,
// older version — mixing instances breaks ZodError methods like treeifyError).
import { z } from "../apps/server/src/lib.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: validate-env.ts <path-to-.env>");
  process.exit(1);
}

const raw = readFileSync(path, "utf8");
const parsed = parse(raw);
const result = parseEnv(parsed);

if (!result.success) {
  console.error(`Invalid env file: ${path}`);
  console.error(JSON.stringify(z.treeifyError(result.error), null, 2));
  process.exit(1);
}

console.log(`OK: ${path}`);
