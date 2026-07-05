import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import AppError from "../utils/AppError";

/**
 * Double-submit CSRF check for cookie-authenticated endpoints (refresh/logout).
 * The `csrfToken` cookie is readable by our JS (not httpOnly) but not by other
 * origins, so requiring its value echoed in a header proves the request came
 * from our own frontend — a cross-site form/fetch can send the cookie but
 * cannot read it to set the header.
 */
export const verifyCsrf = (req: Request, _res: Response, next: NextFunction): void => {
  const cookie = req.cookies?.csrfToken;
  const header = req.get("x-csrf-token");

  if (!cookie || !header) {
    return next(new AppError(403, "CSRF token missing"));
  }

  const a = Buffer.from(String(cookie));
  const b = Buffer.from(String(header));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return next(new AppError(403, "CSRF token invalid"));
  }

  next();
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// verifyCsrf → requires X-CSRF-Token header to match the csrfToken cookie
//              (timing-safe); 403 otherwise. Apply to cookie-auth endpoints.
// ──────────────────────────────────────────────────────────────────────────────
