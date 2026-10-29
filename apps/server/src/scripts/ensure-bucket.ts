import { readFile } from "node:fs/promises";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { env } from "../env.js";
import { s3 } from "../s3.js";

const Bucket = env.AWS_S3_BUCKET;

try {
  await s3.send(new HeadBucketCommand({ Bucket }));
  console.log(`Bucket "${Bucket}" already exists.`);
} catch (error) {
  // HeadBucket has no body, so a missing bucket surfaces as a bare 404.
  if (
    !(error instanceof S3ServiceException) ||
    error.$metadata.httpStatusCode !== 404
  ) {
    throw error;
  }
  await s3.send(new CreateBucketCommand({ Bucket }));
  console.log(`Bucket "${Bucket}" created.`);
}

// s3.policy.json (next to package.json) is the source of truth; its bucket name is
// swapped for this environment's bucket. Applied every run so drift gets corrected.
const policy = JSON.parse(
  await readFile(new URL("../../s3.policy.json", import.meta.url), "utf8"),
) as { Statement: { Resource: string[] }[] };
for (const statement of policy.Statement) {
  statement.Resource = statement.Resource.map((arn) =>
    arn.replace(/^arn:aws:s3:::[^/]+/, `arn:aws:s3:::${Bucket}`),
  );
}
await s3.send(
  new PutBucketPolicyCommand({ Bucket, Policy: JSON.stringify(policy) }),
);
console.log(`Bucket policy applied to "${Bucket}".`);
