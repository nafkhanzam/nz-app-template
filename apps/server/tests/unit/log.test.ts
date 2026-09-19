import { describe, expect, it } from "vitest";
import { createLokiLogger } from "../../src/log.js";

describe("createLokiLogger", () => {
  it("returns null when no Loki URL is configured", () => {
    const logger = createLokiLogger({
      appName: "my-app",
      appEnv: "test",
    });

    expect(logger).toBeNull();
  });

  it("builds a logger with one transport when configured", () => {
    const logger = createLokiLogger({
      lokiUrl: "http://localhost:3100",
      appName: "my-app",
      appEnv: "test",
    });

    expect(logger?.transports).toHaveLength(1);
    logger?.close();
  });
});
