import "dotenv/config";
import { z } from "./lib.js";

const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database
  DATABASE_URL: z.url(),
  DB_POOL_SIZE: z.coerce.number().int().positive().default(10),

  // Authentication
  JWT_ACCESS_KEY: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_KEY: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  // AWS S3
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_S3_BUCKET: z.string(),
  AWS_S3_ENDPOINT: z.string().optional(),
  // PUBLIC_S3_ENDPOINT: z.string(),

  // OIDC
  OIDC_ISSUER: z.url(),
  OIDC_CLIENT_ID: z.string(),
  OIDC_CLIENT_SECRET: z.string(),
  OIDC_REDIRECT_URI: z.url(),
  OIDC_STATE: z.string().optional(),

  // Typst
  TYPST_API_ENDPOINT: z.url().optional(),
  TYPST_API_SECRET_TOKEN: z.string().optional(),
});

// Parse and validate
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(z.treeifyError(parsed.error), null, 2));
  process.exit(1);
}

// Export type for use elsewhere
export type Env = z.infer<typeof envSchema>;

export const env: Env = parsed.data;

export const prod = () => env.NODE_ENV === "production";
