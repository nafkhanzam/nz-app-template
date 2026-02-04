import { forbiddenError } from "./common";
import { JWTPayload } from "./shared/jwt";
import { t } from "./trpc";
import { Role } from "./zenstack/models";

export const checkUser = (fn: (user: JWTPayload) => boolean) => {
  return t.middleware(({ ctx: { user }, next }) => {
    if (!user) {
      throw forbiddenError;
    }
    const valid = fn(user);
    if (!valid) {
      throw forbiddenError;
    }
    return next();
  });
};

export const checkRole = (role: Role) => {
  return t.middleware(({ ctx: { user }, next }) => {
    if (!user) {
      throw forbiddenError;
    }
    const valid = user.role === role;
    if (!valid) {
      throw forbiddenError;
    }
    return next();
  });
};
