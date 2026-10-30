import { changePassword } from "./functions/change-password.js";
import { maintenance } from "./functions/maintenance.js";
import { confirmUpload, getUploadUrl } from "./functions/file-upload.js";
import { hello } from "./functions/hello.js";
import { impersonate, stopImpersonating } from "./functions/impersonate.js";
import { login } from "./functions/login.js";
import { me } from "./functions/me.js";
import {
  allowedRedirectOrigins,
  oidcHandleCallback,
  oidcInitiateLogin,
  oidcLogout,
  oidcProviders,
  oidcUserInfo,
} from "./functions/oidc.js";
import { passwordStatus, setPassword } from "./functions/password.js";
import { refresh } from "./functions/refresh.js";
import { register } from "./functions/register.js";
import { t } from "./trpc.js";
import { createZenStackRouter } from "zenstack-trpc";
import { schema } from "./zenstack/schema.js";
import type { AnyRouter } from "@trpc/server";

export const appRouter = t.router({
  hello,
  login,
  register,
  oidcInitiateLogin,
  oidcHandleCallback,
  oidcLogout,
  oidcProviders,
  oidcUserInfo,
  allowedRedirectOrigins,
  maintenance,
  me,
  impersonate,
  stopImpersonating,
  refresh,
  changePassword,
  passwordStatus,
  setPassword,
  getUploadUrl,
  confirmUpload,
  crud: createZenStackRouter(schema, t) as unknown as AnyRouter,
});

export type AppRouter = typeof appRouter;
