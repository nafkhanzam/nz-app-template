import { TRPCError } from "@trpc/server";
import { hashPassword } from "../common.js";
import { z } from "../lib.js";
import { tuser } from "../trpc.js";

/** OIDC-created users have an empty `passwordHash`, which can never match a login. */
export const passwordStatus = tuser.query(async ({ ctx: { db, user } }) => {
  const found = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  return { hasPassword: found.passwordHash !== "" };
});

/**
 * Lets a user without a password (OIDC sign-up) set one so they can also log in
 * with credentials under their existing username (which cannot be changed).
 */
export const setPassword = tuser
  .input(
    z.object({
      password: z.string().min(8),
    }),
  )
  .mutation(async ({ ctx: { db, user, log }, input }) => {
    const found = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (found.passwordHash !== "") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Password is already set. Use change password instead.",
      });
    }

    const updated = await db.user.update({
      where: { id: found.id },
      data: { passwordHash: hashPassword(input.password) },
    });

    log.info(`trpc.setPassword`, { userId: updated.id });

    return { success: true };
  });
