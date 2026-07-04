import { prisma } from "../config/prisma";
import { NOTIFICATION_TYPES, TASK_STATUS } from "@taskflow/shared";
import { createNotificationService } from "../modules/notification/notification.service";

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000; // notify when due within 24h

/**
 * Scans for tasks whose due date is imminent and notifies their assignees once
 * (guarded by Task.dueReminderSentAt so a task isn't reminded on every run).
 * Wired into the scheduled jobs in server.ts. Respects each user's taskDue
 * preference via createNotificationService.
 */
export const notifyDueSoon = async (): Promise<number> => {
  const now = new Date();
  const soon = new Date(now.getTime() + DUE_SOON_WINDOW_MS);

  const tasks = await prisma.task.findMany({
    where: {
      isDeleted: false,
      status: { notIn: [TASK_STATUS.DONE] as never },
      dueDate: { gte: now, lte: soon },
      dueReminderSentAt: null,
    },
    select: {
      id: true,
      title: true,
      tenantId: true,
      projectId: true,
      assignees: { select: { userId: true } },
    },
  });

  let sent = 0;
  for (const task of tasks) {
    await Promise.all(
      task.assignees.map((a) =>
        createNotificationService({
          userId: a.userId,
          tenantId: task.tenantId,
          type: NOTIFICATION_TYPES.DUE_SOON,
          message: `"${task.title}" is due soon`,
          linkUrl: `/projects/${task.projectId}/tasks/${task.id}`,
        })
      )
    );
    await prisma.task.update({
      where: { id: task.id },
      data: { dueReminderSentAt: now },
    });
    sent += task.assignees.length;
  }
  return sent;
};
