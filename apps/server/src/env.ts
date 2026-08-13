import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { parseEnv, type Env } from "./env-schema.js";
import { z } from "./lib.js";

// expand() needs dotenv's result; calling it bare throws.
expand(config());

const result = parseEnv(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");
  console.error(JSON.stringify(z.treeifyError(result.error), null, 2));
  process.exit(1);
}

export type { Env };

export const env: Env = result.env;

export const prod = () => env.APP_ENV === "production";
