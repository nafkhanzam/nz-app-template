import { TRPCError } from "@trpc/server";
import { Context } from "./context";
import { env } from "./env";
import { bcrypt, jwt, z } from "./lib";
import { jwtPayloadV, type JWTPayload } from "./shared/jwt";
import { User } from "./zenstack/models";

export const unauthorizedError = new TRPCError({
  code: "UNAUTHORIZED",
  message: `You are not authorized.`,
});

export const forbiddenError = new TRPCError({
  code: "FORBIDDEN",
  message: `Access forbidden.`,
});

export const buildAccessToken = (payload: JWTPayload): string => {
  const token = jwt.sign(payload, env.JWT_ACCESS_KEY, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
  return token;
};

export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_KEY);
    const jwtObject = jwtPayloadV.parse(payload);
    return jwtObject;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const buildRefreshToken = async (ctx: Context, userId: string) => {
  const { db } = ctx;
  const refreshToken = await db.refreshToken.create({
    data: {
      userId,
      revoked: false,
    },
  });
  const token = jwt.sign({ id: refreshToken.id }, env.JWT_REFRESH_KEY, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
  return token;
};

export const verifyRefreshToken = (token: string) => {
  const payload = jwt.verify(token, env.JWT_REFRESH_KEY);
  const refreshTokenId = z.object({ id: z.string().nonempty() }).parse(payload);
  return refreshTokenId;
};

const SALT_ROUNDS = 12;

export const hashPassword = (password: string): string => {
  return bcrypt.hashSync(password, SALT_ROUNDS);
};

export const generateTokensFromUser = async (ctx: Context, user: User) => {
  const accessToken = buildAccessToken({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email ?? undefined,
    // @ts-expect-error checked.
    image: user.userInfo?.picture ?? undefined,
  });

  const refreshToken = await buildRefreshToken(ctx, user.id);

  return { accessToken, refreshToken };
};
