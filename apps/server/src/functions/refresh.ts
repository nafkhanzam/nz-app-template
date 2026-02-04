import { TRPCError } from "@trpc/server";
import {
  buildAccessToken,
  buildRefreshToken,
  verifyRefreshToken,
} from "../common.js";
import { z } from "../lib.js";
import { t } from "../trpc.js";

export const refresh = t.procedure
  .input(
    z.object({
      refreshToken: z.string().nonempty(),
    }),
  )
  .mutation(async ({ ctx, ctx: { db, auditLog }, input }) => {
    const payload = verifyRefreshToken(input.refreshToken);
    const refresh = await db.refreshToken.findUnique({
      where: {
        id: payload.id,
      },
      include: {
        User: true,
      },
    });
    if (!refresh || refresh.revoked) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token.",
      });
    }

    const { User: user } = refresh;
    const accessToken = buildAccessToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    const refreshToken = await buildRefreshToken(ctx, user.id);
    await db.refreshToken.delete({
      where: {
        id: payload.id,
      },
    });

    auditLog(`trpc.refresh`, { accessToken, refreshToken });

    return { accessToken, refreshToken };
  });
