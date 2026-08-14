import { expand } from "dotenv-expand";
import { describe, expect, it } from "vitest";

/** Pins dotenv-expand's behaviour: the templates depend on it, secrets suffer from it. */
const runExpand = (values: Record<string, string>) => {
  const parsed = { ...values };
  expand({ parsed, processEnv: {} });
  return parsed;
};

describe("dotenv-expand", () => {
  it("expands references, which the env templates rely on", () => {
    const parsed = runExpand({
      APP_NAME: "myapp",
      APP_ENV: "production",
      AWS_S3_BUCKET: "$APP_NAME-$APP_ENV",
    });

    expect(parsed.AWS_S3_BUCKET).toBe("myapp-production");
  });

  it("swallows $ followed by a name, so secrets must not contain one", () => {
    const parsed = runExpand({ SECRET: "abc$def" });

    expect(parsed.SECRET).toBe("abc");
  });

  it("resolves an unknown reference to an empty string", () => {
    const parsed = runExpand({ SECRET: "pa${MISSING}ss" });

    expect(parsed.SECRET).toBe("pass");
  });
});
