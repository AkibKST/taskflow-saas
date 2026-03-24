import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";

export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, `Access denied.`);
    }
    next();
  };
};
