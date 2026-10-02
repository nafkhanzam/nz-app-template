import { TRPCError } from "@trpc/server";
import { forbiddenError, generateTokensFromUser } from "../common.js";
import { z } from "../lib.js";
import { tuser } from "../trpc.js";

// Admin-only. Returns access + refresh tokens for the target user, both
// flagged impersonation: true (the refresh token carries it as a signed claim,
// so refreshing stays in impersonation mode).
export const impersonate = tuser
  .input(z.object({ userId: z.string().nonempty() }))
  .mutation(async ({ ctx, ctx: { db, log, user: actor }, input }) => {
    if (actor.role !== "ADMIN" || actor.impersonation) {
      throw forbiddenError;
    }
    if (input.userId === actor.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot impersonate yourself.",
      });
    }

    const target = await db.user.findUnique({ where: { id: input.userId } });
    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    }

    log.info(`trpc.impersonate`, { actorId: actor.id, targetId: target.id });

    return generateTokensFromUser(ctx, target, true);
  });
