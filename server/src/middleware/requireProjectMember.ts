import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import AppError from "../utils/AppError";

// Guards project- and task-scoped routes by verifying the caller is a member
// of the project in :projectId.
// Tenant-level OWNER and ADMIN bypass this check — they can access all projects.
// Attaches (req as any).projectRole so downstream handlers can inspect it.
export const requireProjectMember = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId, tenantId, role } = req.user!;
    const projectId = req.params.projectId;

    if (!projectId) return next(new AppError(400, "projectId param required"));

    if (role === "OWNER" || role === "ADMIN") return next();

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });

    if (!membership) {
      // Verify the project belongs to the user's tenant before giving a 403
      const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId, isDeleted: false },
        select: { id: true },
      });
      if (!project) return next(new AppError(404, "Project not found"));
      return next(new AppError(403, "You are not a member of this project"));
    }

    (req as any).projectRole = membership.role;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// requireProjectMember(req, res, next)
//   → Express middleware; checks ProjectMember table for :projectId + current user.
//     OWNER/ADMIN bypass. Sets (req as any).projectRole for downstream use.
//     Returns 403 if user is not a project member, 404 if project doesn't exist.
// ──────────────────────────────────────────────────────────────────────────────
