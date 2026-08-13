import { describe, expect, it } from "vitest";
import { getReadiness, isReady } from "../../src/health.js";

const ok = () => Promise.resolve();
const fail = (message: string) => () => Promise.reject(new Error(message));

describe("getReadiness", () => {
  it("reports ready when every probe resolves", async () => {
    const report = await getReadiness({ database: ok, objectStorage: ok });

    expect(isReady(report)).toBe(true);
  });

  it("names the failing dependency", async () => {
    const report = await getReadiness({
      database: fail("connection refused"),
      objectStorage: ok,
    });

    expect(isReady(report)).toBe(false);
    expect(report.database).toEqual({ ok: false, error: "connection refused" });
    expect(report.objectStorage.ok).toBe(true);
  });

  it("keeps checking after one probe fails", async () => {
    const report = await getReadiness({
      database: fail("db down"),
      objectStorage: fail("bucket missing"),
    });

    expect(report.database.error).toBe("db down");
    expect(report.objectStorage.error).toBe("bucket missing");
  });
});
