import { prisma } from "../config/prisma";

export type ProjectAccess =
  | { ok: true; projectRole: "OWNER_ADMIN" | "MANAGER" | "MEMBER" | "VIEWER" }
  | { ok: false; reason: "not_found" | "forbidden" };

/**
 * Single source of truth for "may this user touch this project?", shared by the
 * REST `requireProjectMember` middleware and the Socket.IO `PROJECT_JOIN`
 * handler so both layers enforce identical tenant + membership rules.
 *
 * - Tenant OWNER/ADMIN can access every project in their tenant.
 * - Everyone else must have a ProjectMember row.
 * - A project in another tenant is reported as `not_found` (no existence leak).
 */
export const checkProjectAccess = async (
  userId: string,
  tenantId: string,
  role: string,
  projectId: string
): Promise<ProjectAccess> => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, isDeleted: false },
    select: { id: true },
  });
  if (!project) return { ok: false, reason: "not_found" };

  if (role === "OWNER" || role === "ADMIN") {
    return { ok: true, projectRole: "OWNER_ADMIN" };
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (!membership) return { ok: false, reason: "forbidden" };

  return { ok: true, projectRole: membership.role };
};
