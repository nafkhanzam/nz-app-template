import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { db } from "./db.js";
import { env } from "./env.js";
import { s3 } from "./s3.js";

export type CheckResult = { ok: boolean; error?: string };

export type ReadinessReport = {
  database: CheckResult;
  objectStorage: CheckResult;
};

/** Each check takes its probe as an argument so tests can supply their own. */
export type Probe = () => PromiseLike<unknown>;

const run = async (probe: Probe): Promise<CheckResult> => {
  try {
    await probe();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const probeDatabase: Probe = () => db.$queryRaw`SELECT 1`;

export const probeObjectStorage: Probe = () =>
  s3.send(new HeadBucketCommand({ Bucket: env.AWS_S3_BUCKET }));

export const isReady = (report: ReadinessReport) =>
  Object.values(report).every((check) => check.ok);

export const getReadiness = async (
  probes: { database?: Probe; objectStorage?: Probe } = {},
): Promise<ReadinessReport> => {
  const [database, objectStorage] = await Promise.all([
    run(probes.database ?? probeDatabase),
    run(probes.objectStorage ?? probeObjectStorage),
  ]);
  return { database, objectStorage };
};

/** Set at build time via `ARG GIT_SHA` in the Dockerfile. */
export const gitSha = () => process.env.GIT_SHA ?? "unknown";
