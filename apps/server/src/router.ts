import { changePassword } from "./functions/change-password.ts";
import { confirmUpload, getUploadUrl } from "./functions/file-upload.ts";
import { hello } from "./functions/hello.ts";
import { login } from "./functions/login.js";
import { me } from "./functions/me.ts";
import {
  oidcHandleCallback,
  oidcInitiateLogin,
  oidcLogout,
  oidcUserInfo,
} from "./functions/oidc.js";
import { refresh } from "./functions/refresh.ts";
import { register } from "./functions/register.ts";
import { t } from "./trpc.ts";
import { createZenStackRouter } from "zenstack-trpc";
import { schema } from "./zenstack/schema.ts";
import { AnyRouter } from "@trpc/server";

export const appRouter = t.router({
  hello,
  login,
  register,
  oidcInitiateLogin,
  oidcHandleCallback,
  oidcLogout,
  oidcUserInfo,
  me,
  refresh,
  changePassword,
  getUploadUrl,
  confirmUpload,
  crud: createZenStackRouter(schema, t) as unknown as AnyRouter,
});

export type AppRouter = typeof appRouter;
