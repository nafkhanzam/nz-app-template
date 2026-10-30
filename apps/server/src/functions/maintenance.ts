import { db } from "../db.js";
import { z } from "../lib.js";
import { t } from "../trpc.js";

const maintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().nullable().optional(),
  until: z.iso.datetime().nullable().optional(),
});

/** Public: the app shell needs it before knowing who is logged in. Missing or invalid row means off. */
export const maintenance = t.procedure.query(async () => {
  const row = await db.appConfig.findUnique({ where: { key: "maintenance" } });
  const res = maintenanceSchema.safeParse(row?.value);
  return {
    enabled: res.success && res.data.enabled,
    message: (res.success && res.data.message) || null,
    until: (res.success && res.data.until) || null,
  };
});
