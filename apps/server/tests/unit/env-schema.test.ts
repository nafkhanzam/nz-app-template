import { describe, expect, it } from "vitest";
import { parseEnv } from "../../src/env-schema.js";

const base = {
  APP_ENV: "test",
  APP_NAME: "my-app",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  JWT_ACCESS_KEY: "access-key-that-is-at-least-32-chars",
  JWT_REFRESH_KEY: "refresh-key-that-is-at-least-32-char",
  AWS_ACCESS_KEY_ID: "key-id",
  AWS_SECRET_ACCESS_KEY: "secret",
  AWS_S3_BUCKET: "bucket",
};

const oidc = {
  OIDC_ISSUER: "https://auth.example.com",
  OIDC_CLIENT_ID: "client-id",
  OIDC_CLIENT_SECRET: "client-secret",
  OIDC_REDIRECT_URI: "https://app.example.com/auth/callback",
};

describe("parseEnv", () => {
  it("boots without OIDC and without Loki", () => {
    const result = parseEnv(base);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.env.oidc).toBeNull();
    expect(result.env.LOKI_URL).toBeUndefined();
  });

  it("builds env.oidc only once every setting is present", () => {
    const partial = parseEnv({ ...base, OIDC_ISSUER: oidc.OIDC_ISSUER });
    const complete = parseEnv({ ...base, ...oidc });

    expect(partial.success && partial.env.oidc).toBeNull();
    expect(complete.success && complete.env.oidc).toEqual({
      issuer: oidc.OIDC_ISSUER,
      clientId: oidc.OIDC_CLIENT_ID,
      clientSecret: oidc.OIDC_CLIENT_SECRET,
      redirectUri: oidc.OIDC_REDIRECT_URI,
      state: "",
    });
  });

  it("rejects a missing APP_NAME instead of defaulting to the package name", () => {
    const { APP_NAME: _, ...withoutAppName } = base;

    const result = parseEnv(withoutAppName);

    expect(result.success).toBe(false);
  });

  it("rejects a missing DATABASE_URL", () => {
    const { DATABASE_URL: _, ...withoutDb } = base;

    expect(parseEnv(withoutDb).success).toBe(false);
  });

  it("rejects a JWT key shorter than 32 characters", () => {
    expect(parseEnv({ ...base, JWT_ACCESS_KEY: "too-short" }).success).toBe(
      false,
    );
  });

  it("reads VERBOSE from its string form", () => {
    const cases: [string | undefined, boolean][] = [
      [undefined, false],
      ["", false],
      ["true", true],
      ["TRUE", true],
      ["1", true],
      ["false", false],
      ["0", false],
    ];

    for (const [input, expected] of cases) {
      const result = parseEnv({ ...base, VERBOSE: input });
      expect(result.success && result.env.VERBOSE, `VERBOSE=${input}`).toBe(
        expected,
      );
    }
  });

  it("keeps a $ inside a secret intact", () => {
    const result = parseEnv({ ...base, AWS_SECRET_ACCESS_KEY: "abc$def" });

    expect(result.success && result.env.AWS_SECRET_ACCESS_KEY).toBe("abc$def");
  });
});
