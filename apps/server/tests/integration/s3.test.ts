import { request } from "node:http";
import { beforeAll, describe, expect, it } from "vitest";
import { env } from "../../src/env.js";
import {
  generateFileKey,
  generatePresignedUploadUrl,
  getFileSize,
  getFileUrl,
} from "../../src/s3.js";

const PAYLOAD = "hello from the integration test";
const CONTENT_TYPE = "text/plain";

/**
 * Garage resolves the bucket from the Host header, so the anonymous read is
 * issued against the web port with an explicit Host instead of via DNS.
 */
const readAnonymously = (key: string) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const publicUrl = new URL(getFileUrl(key));
    const req = request(
      {
        host: "127.0.0.1",
        port: publicUrl.port,
        path: publicUrl.pathname,
        headers: { Host: publicUrl.host },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });

describe("garage round trip", () => {
  beforeAll(() => {
    if (!env.AWS_S3_ENDPOINT || !env.PUBLIC_S3_ENDPOINT) {
      throw new Error(
        "AWS_S3_ENDPOINT and PUBLIC_S3_ENDPOINT must be set. Start Garage " +
          "(docker compose -f docker-compose.services.yml up -d garage), run " +
          "scripts/garage-init.sh, then fill apps/server/.env.",
      );
    }
  });

  it("uploads through a presigned url, then reads it back anonymously", async () => {
    const { key } = generateFileKey("integration-user", "hello.txt");

    const uploadUrl = await generatePresignedUploadUrl({
      key,
      contentType: CONTENT_TYPE,
      contentLength: Buffer.byteLength(PAYLOAD),
    });

    const upload = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": CONTENT_TYPE },
      body: PAYLOAD,
    });
    expect(upload.status).toBe(200);

    // HeadObject — the same call confirmUpload relies on.
    const stat = await getFileSize(key);
    expect(stat.size).toBe(Buffer.byteLength(PAYLOAD));
    expect(stat.contentType).toBe(CONTENT_TYPE);

    const download = await readAnonymously(key);
    expect(download.status).toBe(200);
    expect(download.body).toBe(PAYLOAD);
  });

  it("rejects a presigned url once it has expired", async () => {
    const { key } = generateFileKey("integration-user", "expired.txt");

    const uploadUrl = await generatePresignedUploadUrl({
      key,
      contentType: CONTENT_TYPE,
      expiresIn: 1,
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const upload = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": CONTENT_TYPE },
      body: PAYLOAD,
    });

    // Garage answers 400 where AWS answers 403, so assert the rejection
    // itself rather than one implementation's status code.
    expect(upload.ok).toBe(false);
    expect(upload.status).toBeGreaterThanOrEqual(400);
    expect(upload.status).toBeLessThan(500);
  });

  it("does not expose an object that was never uploaded", async () => {
    const download = await readAnonymously("integration-user/missing.txt");

    expect(download.status).toBe(404);
  });
});
