import { z } from ".";

export const jwtPayloadV = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  email: z.string().optional(),
  image: z.string().optional(),
  role: z.enum(["ADMIN", "DOSEN", "STUDENT"]),
});
export type JWTPayload = z.infer<typeof jwtPayloadV>;

export type MeResponse = JWTPayload;
