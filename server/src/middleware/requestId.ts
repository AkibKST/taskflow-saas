import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Assigns a stable id to every request so a user-reported error can be traced
 * back to its log lines. Honors an inbound `X-Request-Id` (set by a load
 * balancer) and always echoes the id back on the response.
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers["x-request-id"];
  const id =
    (Array.isArray(incoming) ? incoming[0] : incoming) ||
    crypto.randomUUID();
  (req as any).id = id;
  res.setHeader("X-Request-Id", id);
  next();
};
