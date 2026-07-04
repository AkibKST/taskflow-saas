import { prisma } from "../../config/prisma";
import { ROLES } from "@taskflow/shared";

interface SearchArgs {
  q: string;
  tenantId: string;
  userId: string;
  role: string;
  limit?: number;
}

// Resolve the set of project ids the caller may see: everything in the tenant
// for OWNER/ADMIN, otherwise only projects they're a member of. Search results
// are then constrained to these, so search never leaks cross-project data.
const accessibleProjectIds = async (
  tenantId: string,
  userId: string,
  role: string
): Promise<string[]> => {
  if (role === ROLES.OWNER || role === ROLES.ADMIN) {
    const projects = await prisma.project.findMany({
      where: { tenantId, isDeleted: false },
      select: { id: true },
    });
    return projects.map((p) => p.id);
  }
  const memberships = await prisma.projectMember.findMany({
    where: { userId, project: { tenantId, isDeleted: false } },
    select: { projectId: true },
  });
  return memberships.map((m) => m.projectId);
};

export const searchService = async ({
  q,
  tenantId,
  userId,
  role,
  limit = 10,
}: SearchArgs) => {
  const query = q.trim();
  if (query.length < 2) return { query, projects: [], tasks: [] };

  const projectIds = await accessibleProjectIds(tenantId, userId, role);
  if (projectIds.length === 0) return { query, projects: [], tasks: [] };

  const contains = { contains: query, mode: "insensitive" as const };

  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: {
        id: { in: projectIds },
        OR: [{ name: contains }, { description: contains }],
      },
      select: { id: true, name: true, description: true, color: true, status: true },
      take: limit,
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        tenantId,
        isDeleted: false,
        OR: [{ title: contains }, { description: contains }],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        projectId: true,
        project: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
  ]);

  return { query, projects, tasks };
};
