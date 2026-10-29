import { TRPCError } from "@trpc/server";
import { appConfigSchemas, getMaintenance } from "../app-config.js";
import { db } from "../db.js";
import type { JsonValue } from "../lib.js";
import { z } from "../lib.js";
import { t, tuser } from "../trpc.js";

// AppConfig is denied by policies, so it is only reachable through these admin procedures.
const tadmin = tuser.use(({ ctx, next }) => {
  if (ctx.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
  return next();
});

const keySchema = z.string().regex(/^[a-z0-9_.-]+$/i).max(100);

export const listAppConfigs = tadmin.query(async () => {
  const rows = await db.appConfig.findMany({ orderBy: { key: "asc" } });
  return rows.map((r) => ({
    key: r.key,
    value: r.value,
    updatedAt: r.updatedAt,
    known: r.key in appConfigSchemas,
  }));
});

/** Public: the app shell needs it before knowing who is logged in. */
export const maintenance = t.procedure.query(() => getMaintenance());

export const setAppConfig = tadmin
  .input(z.object({ key: keySchema, value: z.json() }))
  .mutation(async ({ input: { key, value } }) => {
    const schema = appConfigSchemas[key];
    if (schema) {
      const res = schema.safeParse(value);
      if (!res.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid value for ${key}: ${z.prettifyError(res.error)}`,
        });
      }
    }
    const json = value as JsonValue;
    await db.appConfig.upsert({
      where: { key },
      create: { key, value: json },
      update: { value: json },
    });
  });

export const deleteAppConfig = tadmin
  .input(z.object({ key: keySchema }))
  .mutation(async ({ input: { key } }) => {
    await db.appConfig.delete({ where: { key } });
  });
