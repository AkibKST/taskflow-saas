import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";
import { envVars } from "../config/env";

/**
 * Gates sensitive actions (inviting teammates, changing billing) behind a
 * verified email. Controlled by REQUIRE_EMAIL_VERIFICATION — when off (default)
 * it is a no-op, so existing deployments are unaffected until they opt in.
 * verifyToken populates req.user.emailVerifiedAt from the DB.
 */
export const requireVerifiedEmail = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!envVars.REQUIRE_EMAIL_VERIFICATION) return next();
  if (req.user?.emailVerifiedAt) return next();
  return next(
    new AppError(403, "Please verify your email address to perform this action")
  );
};
