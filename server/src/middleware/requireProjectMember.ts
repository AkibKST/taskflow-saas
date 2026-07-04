import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";
import { checkProjectAccess } from "../utils/projectAccess";

// Guards project- and task-scoped routes by verifying the caller is a member
// of the project in :projectId.
// Tenant-level OWNER and ADMIN bypass the membership requirement — they can
// access all projects in their own tenant.
// Attaches (req as any).projectRole so downstream handlers can enforce
// project-level permissions (MANAGER/MEMBER can write, VIEWER is read-only).
export const requireProjectMember = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId, tenantId, role } = req.user!;
    // Params come through merged routers as `string | string[]`; normalize.
    const projectId = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;

    if (!projectId) return next(new AppError(400, "projectId param required"));

    const access = await checkProjectAccess(userId, tenantId, role, projectId);

    if (!access.ok) {
      if (access.reason === "not_found")
        return next(new AppError(404, "Project not found"));
      return next(new AppError(403, "You are not a member of this project"));
    }

    (req as any).projectRole = access.projectRole;
    next();
  } catch (err) {
    next(err);
  }
};
