import { TRPCError } from "@trpc/server";
import {
  getAllowedRedirectOrigins,
  getOIDCProviders,
  isAllowedRedirect,
  type OIDCProvider,
} from "../app-config.js";
import { generateTokensFromUser } from "../common.js";
import { appLog } from "../log.js";
import { axios, type JsonValue, z } from "../lib.js";
import { t } from "../trpc.js";
import { Role, type User } from "../zenstack/models.js";

interface OIDCTokenResponse {
  access_token: string;
  token_type: string;
  id_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface SsoGroup {
  group_id: string;
  group_name: string;
}

interface OIDCUserInfo {
  sub: string;
  name?: string;
  role?: string[];
  group?: SsoGroup[];
  email?: string;
  gender?: string;
  locale?: string;
  locked?: string | null;
  reg_id?: string;
  enabled?: string;
  picture?: string;
  nickname?: string | null;
  zoneinfo?: string;
  birthdate?: string;
  suspended?: string | null;
  updated_at?: string;
  has_suspended?: string;
  email_verified?: string;
  alternate_email?: string;
  must_change_pwd?: string;
  preferred_username?: string;
  alternate_email_verified?: string;
}

interface OIDCConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
  issuer: string;
}

interface OIDCState {
  providerId: string;
  nonce: string;
  link?: boolean;
  direct?: string;
  redirectUrl?: string;
}

async function getProvider(id: string): Promise<OIDCProvider> {
  const provider = (await getOIDCProviders()).find((p) => p.id === id);
  if (!provider) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unknown OIDC provider: ${id}`,
    });
  }
  return provider;
}

// Per-provider cache for OIDC configuration to avoid repeated requests
const oidcConfigCache = new Map<string, OIDCConfiguration>();

/**
 * Fetch OIDC configuration from .well-known endpoint
 */
async function getOIDCConfiguration(
  provider: OIDCProvider,
): Promise<OIDCConfiguration> {
  const cacheKey = `${provider.id}|${provider.issuer}`;
  const cached = oidcConfigCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const configUrl = `${provider.issuer}/.well-known/openid-configuration`;
    const response = await axios.get<OIDCConfiguration>(configUrl);
    oidcConfigCache.set(cacheKey, response.data);
    return response.data;
  } catch (error: any) {
    appLog.error(
      "Failed to fetch OIDC configuration",
      error.response?.data || error.message,
    );
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch OIDC provider configuration",
    });
  }
}

/**
 * List configured OIDC providers (public info only)
 */
export const oidcProviders = t.procedure.query(async () =>
  (await getOIDCProviders()).map(({ id, name, issuer, iconUrl }) => ({ id, name, issuer, iconUrl })),
);

/**
 * Origins post-login redirects may target (public; client validates against it)
 */
export const allowedRedirectOrigins = t.procedure.query(() =>
  getAllowedRedirectOrigins(),
);

/**
 * Initiate OIDC login flow
 * Returns the authorization URL that the client should redirect to
 */
export const oidcInitiateLogin = t.procedure
  .input(
    z.object({
      providerId: z.string(),
      nonce: z.string().min(16),
      link: z.boolean().optional(),
      redirectUrl: z.string().optional(),
    }),
  )
  .query(async ({ input }) => {
    if (input.redirectUrl && !(await isAllowedRedirect(input.redirectUrl))) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Redirect URL is not allowed",
      });
    }
    const provider = await getProvider(input.providerId);
    const config = await getOIDCConfiguration(provider);
    const state: OIDCState = {
      providerId: provider.id,
      nonce: input.nonce,
      link: input.link,
      direct: provider.directUri,
      redirectUrl: input.redirectUrl,
    };

    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      response_type: "code",
      scope: "openid profile email role group",
      state: JSON.stringify(state),
    });

    const authUrl = `${config.authorization_endpoint}?${params}`;

    return {
      authUrl,
    };
  });

/**
 * Handle OIDC callback after user authenticates with provider
 * Exchanges authorization code for tokens and creates/updates user
 */
export const oidcHandleCallback = t.procedure
  .input(
    z.object({
      providerId: z.string(),
      code: z.string(),
      link: z.boolean().optional(),
    }),
  )
  .mutation(async ({ ctx, ctx: { db, log }, input }) => {
    try {
      const provider = await getProvider(input.providerId);
      const config = await getOIDCConfiguration(provider);

      // Exchange code for tokens
      const tokenResponse = await axios
        .post<OIDCTokenResponse>(
          config.token_endpoint,
          new URLSearchParams({
            grant_type: "authorization_code",
            code: input.code,
            redirect_uri: provider.redirectUri,
            client_id: provider.clientId,
            client_secret: provider.clientSecret,
          }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        )
        .catch((error: any) => {
          log.error(
            "Token exchange failed",
            error.response?.data || error.message,
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to exchange code for token",
          });
        });

      const tokens = tokenResponse.data;

      // Fetch user info
      const userInfoResponse = await axios
        .get<OIDCUserInfo>(config.userinfo_endpoint, {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        })
        .catch((error: any) => {
          log.error(
            "User info fetch failed",
            error.response?.data || error.message,
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch user info",
          });
        });

      const userInfo = userInfoResponse.data;
      const userInfoJson = userInfo as unknown as JsonValue;

      log.info(`oidc:user-info`, {
        userInfo: userInfoJson,
      });

      const issuer = provider.issuer;
      const sub = userInfo.sub;
      const username = userInfo.preferred_username ?? sub;
      const name = userInfo.name ?? username;
      const email = userInfo.email;
      const image = userInfo.picture;

      const identity = await db.userOidc.findUnique({
        where: { issuer_sub: { issuer, sub } },
        include: { User: true },
      });

      let user: User;
      if (identity) {
        if (input.link && identity.userId !== ctx.user?.id) {
          // Without this the callback would silently log in as the other user
          throw new TRPCError({
            code: "CONFLICT",
            message: "This account is already linked to another user",
          });
        }
        // Known identity: refresh stored info
        await db.userOidc.update({
          where: { id: identity.id },
          data: { userInfo: userInfoJson },
        });
        user = await db.user.update({
          where: { id: identity.userId },
          data: { name, email, image },
        });
      } else if (input.link) {
        // Explicit link of a new identity to the logged-in user
        if (!ctx.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Login required to link an account",
          });
        }
        await db.userOidc.create({
          data: { userId: ctx.user.id, issuer, sub, userInfo: userInfoJson },
        });
        user = await db.user.findUniqueOrThrow({ where: { id: ctx.user.id } });
      } else {
        user = await db.user.create({
          data: {
            username,
            name,
            email,
            image,
            passwordHash: "", // OIDC users don't need password
            role: Role.USER,
            Oidc: {
              create: { issuer, sub, userInfo: userInfoJson },
            },
          },
        });
      }

      // Generate JWT tokens using existing auth system
      const appTokens = await generateTokensFromUser(ctx, user);

      log.info(`trpc.oidc.login`, { username } as unknown as JsonValue);

      // Return tokens and user info
      return {
        accessToken: appTokens.accessToken,
        refreshToken: appTokens.refreshToken,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      log.error("OIDC callback error", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error during OIDC callback",
      });
    }
  });

/**
 * Get OIDC logout URL
 * Returns the URL to logout from the OIDC provider
 */
export const oidcLogout = t.procedure
  .input(z.object({ providerId: z.string() }))
  .query(async ({ input }) => {
    const provider = await getProvider(input.providerId);
    const config = await getOIDCConfiguration(provider);
    const logoutUrl =
      config.end_session_endpoint ||
      `${provider.issuer}/protocol/openid-connect/logout`;
    return { logoutUrl };
  });

/**
 * Get user info from OIDC for the authenticated user
 * Returns userInfo of every OIDC identity linked to the user
 */
export const oidcUserInfo = t.procedure.query(async ({ ctx: { db, user } }) => {
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  const identities = await db.userOidc.findMany({
    where: { userId: user.id },
    select: { issuer: true, userInfo: true },
  });

  return identities;
});
