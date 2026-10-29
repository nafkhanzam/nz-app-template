import { db } from "./db.js";
import { z } from "./lib.js";

export const oidcProviderSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/i),
  name: z.string(),
  issuer: z.url(),
  clientId: z.string(),
  clientSecret: z.string(),
  redirectUri: z.url(),
  directUri: z.string().optional(),
  iconUrl: z.url({ protocol: /^https?$/ }).optional(),
});

export type OIDCProvider = z.infer<typeof oidcProviderSchema>;

export const maintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().nullable().optional(),
  until: z.iso.datetime().nullable().optional(),
});

/** Known keys and their value schemas; unknown keys accept any JSON. */
export const appConfigSchemas: Record<string, z.ZodType> = {
  oidc_providers: z.array(oidcProviderSchema),
  allowed_redirect_origins: z.array(z.url()),
  maintenance: maintenanceSchema,
};

/**
 * Read `AppConfig.oidc_providers` (raw db: AppConfig is denied by policies).
 * Missing row means no providers configured.
 */
export async function getOIDCProviders(): Promise<OIDCProvider[]> {
  const row = await db.appConfig.findUnique({
    where: { key: "oidc_providers" },
  });
  if (!row) {
    return [];
  }
  return z.array(oidcProviderSchema).parse(row.value);
}

/**
 * Read `AppConfig.allowed_redirect_origins`: JSON array of origins (e.g.
 * ["https://other.example.com"]) that post-login redirects may point to.
 */
export async function getAllowedRedirectOrigins(): Promise<string[]> {
  const row = await db.appConfig.findUnique({
    where: { key: "allowed_redirect_origins" },
  });
  if (!row) {
    return [];
  }
  return z
    .array(z.url())
    .parse(row.value)
    .map((url) => new URL(url).origin);
}

/** Same-origin absolute path, or an absolute http(s) URL on an allowed origin. */
export async function isAllowedRedirect(value: string): Promise<boolean> {
  if (value.startsWith("/")) {
    return !value.startsWith("//") && !value.startsWith("/\\");
  }
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      (await getAllowedRedirectOrigins()).includes(url.origin)
    );
  } catch {
    return false;
  }
}

/** Read `AppConfig.maintenance`. Missing or invalid row means maintenance is off. */
export async function getMaintenance() {
  const row = await db.appConfig.findUnique({ where: { key: "maintenance" } });
  const res = maintenanceSchema.safeParse(row?.value);
  return {
    enabled: res.success && res.data.enabled,
    message: (res.success && res.data.message) || null,
    until: (res.success && res.data.until) || null,
  };
}
