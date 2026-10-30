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
