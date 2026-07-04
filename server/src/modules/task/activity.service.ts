import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";
import { logger } from "../../utils/logger";

export const TASK_ACTIVITY = {
  CREATED: "created",
  STATUS_CHANGED: "status_changed",
  PRIORITY_CHANGED: "priority_changed",
  DUE_DATE_CHANGED: "due_date_changed",
  ASSIGNEES_CHANGED: "assignees_changed",
  TITLE_CHANGED: "title_changed",
  ATTACHMENT_ADDED: "attachment_added",
  ATTACHMENT_REMOVED: "attachment_removed",
} as const;

/**
 * Append an entry to a task's activity feed. Best-effort: recording history must
 * never fail the underlying task mutation.
 */
export const recordActivity = async (
  taskId: string,
  userId: string | null,
  type: string,
  data?: Record<string, unknown>
): Promise<void> => {
  try {
    await prisma.taskActivity.create({
      data: { taskId, userId, type, data: data as any },
    });
  } catch (err) {
    logger.error("task activity write failed", { taskId, type, err: String(err) });
  }
};

export const listActivityService = async (
  taskId: string,
  projectId: string,
  tenantId: string
) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId, tenantId },
    select: { id: true },
  });
  if (!task) throw new AppError(404, "Task not found");

  return prisma.taskActivity.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
};
