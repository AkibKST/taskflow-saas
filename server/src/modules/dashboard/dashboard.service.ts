import { prisma } from "../../config/prisma";

/**
 * One round of aggregates powering the dashboard page. Per-user sections are
 * always returned; tenant-wide stats and the team list only for OWNER/ADMIN
 * (the client hides those cards for other roles anyway).
 */
export const dashboardSummaryService = async (
  userId: string,
  tenantId: string,
  role: string
) => {
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const [myTasks, recentProjects, unreadNotifications, statusGroups] =
    await Promise.all([
      prisma.task.findMany({
        where: {
          tenantId,
          isDeleted: false,
          status: { not: "DONE" },
          assignees: { some: { userId } },
        },
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
        take: 8,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.project.findMany({
        where: { tenantId, members: { some: { userId } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, name: true, color: true, status: true, updatedAt: true },
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.task.groupBy({
        by: ["status"],
        where: {
          tenantId,
          isDeleted: false,
          // Admins see the whole tenant; everyone else their own projects.
          ...(isAdmin ? {} : { project: { members: { some: { userId } } } }),
        },
        _count: { _all: true },
      }),
    ]);

  const tasksByStatus = Object.fromEntries(
    statusGroups.map((g) => [g.status, g._count._all])
  );

  if (!isAdmin) {
    return { myTasks, recentProjects, unreadNotifications, tasksByStatus };
  }

  const [totalUsers, activeUsers, totalProjects, totalTasks, team] =
    await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.user.count({ where: { tenantId, isActive: true } }),
      prisma.project.count({ where: { tenantId } }),
      prisma.task.count({ where: { tenantId, isDeleted: false } }),
      prisma.user.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: "asc" },
        take: 8,
        select: { id: true, name: true, email: true, role: true },
      }),
    ]);

  return {
    myTasks,
    recentProjects,
    unreadNotifications,
    tasksByStatus,
    totalUsers,
    activeUsers,
    totalProjects,
    totalTasks,
    team,
  };
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// dashboardSummaryService → per-user aggregates (my open tasks, recent
//   projects, unread count, tasks-by-status) plus tenant-wide totals and the
//   team list for OWNER/ADMIN callers.
// ──────────────────────────────────────────────────────────────────────────────
