import { tuser } from "../trpc";

export const me = tuser.query(async ({ ctx: { user, auditLog, db } }) => {
  auditLog(`me`);

  return user;
});
