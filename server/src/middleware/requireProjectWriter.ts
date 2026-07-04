import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";

/**
 * Enforces project-level write permission. Must run AFTER requireProjectMember,
 * which sets req.projectRole. A project VIEWER is read-only even when their org
 * role (MEMBER/MANAGER) would otherwise allow writing; tenant OWNER/ADMIN and
 * project MANAGER/MEMBER may write.
 */
export const requireProjectWriter = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const projectRole = req.projectRole;
  if (projectRole === "VIEWER") {
    return next(new AppError(403, "You have read-only access to this project"));
  }
  next();
};
