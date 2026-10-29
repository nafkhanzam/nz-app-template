import { TRPCError } from "@trpc/server";
import { unauthorizedError, hashPassword } from "../common.js";
import { bcrypt, z } from "../lib.js";
import { tuser } from "../trpc.js";

export const changePassword = tuser
  .input(
    z.object({
      oldPassword: z.string(),
      newPassword: z.string().min(8),
    }),
  )
  .mutation(async ({ ctx: { db, user, log }, input }) => {
    const found = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true },
    });
    if (!found?.passwordHash) {
      throw unauthorizedError;
    }

    // old must match
    if (!bcrypt.compareSync(input.oldPassword, found.passwordHash)) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Wrong old password.",
      });
    }

    // new must be different from old
    if (bcrypt.compareSync(input.newPassword, found.passwordHash)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "New password must be different from the old password.",
      });
    }

    const newHashed = hashPassword(input.newPassword);
    await db.user.update({
      where: { id: found.id },
      data: { passwordHash: newHashed },
    });

    log.info(`changePassword`, { userId: found.id });

    return { success: true };
  });
