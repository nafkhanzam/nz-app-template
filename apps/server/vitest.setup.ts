/**
 * Modules such as ./src/env.ts call process.exit(1) on invalid config, which
 * would kill the test runner before a single assertion runs. Seed a minimal
 * valid environment so those modules can be imported.
 *
 * Only fills what is unset, so a developer's real .env never gets overwritten.
 */
import { config } from "dotenv";

// Load .env first so real local values win over the fallbacks below — the
// integration tests need actual Garage credentials, not placeholders.
config();

const defaults: Record<string, string> = {
  APP_ENV: "test",
  APP_NAME: "nz-app-template",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/testdb",
  JWT_ACCESS_KEY: "test-access-key-that-is-long-enough-0001",
  JWT_REFRESH_KEY: "test-refresh-key-that-is-long-enough-001",
  AWS_ACCESS_KEY_ID: "test-access-key-id",
  AWS_SECRET_ACCESS_KEY: "test-secret-access-key",
  AWS_S3_BUCKET: "test-bucket",
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}
