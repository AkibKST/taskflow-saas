import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";
import { Prisma } from "../../generated/prisma/client";
import type { TaskStatus, Priority } from "../../generated/prisma/client";
import { SOCKET_EVENTS, NOTIFICATION_TYPES } from "@taskflow/shared";
import { emitToProject } from "../../socket";
import { createNotificationService } from "../notification/notification.service";
import { CreateTaskInput, UpdateTaskInput, ListTasksQuery } from "./task.model";

const assertTaskInProject = async (
  taskId: string,
  projectId: string,
  tenantId: string
) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId, tenantId, isDeleted: false },
  });
  if (!task) throw new AppError(404, "Task not found");
  return task;
};

const toTaskDTO = (task: any) => ({
  ...task,
  assignees: task.assignees?.map((a: any) => ({
    id: a.user.id,
    name: a.user.name,
    email: a.user.email,
    assignedAt: a.assignedAt,
  })),
});

export const listTasksService = async (
  projectId: string,
  tenantId: string,
  query: ListTasksQuery
) => {
  const { status, priority, assigneeId, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: any = { projectId, tenantId, isDeleted: false };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assignees = { some: { userId: assigneeId } };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { subTasks: { where: { isDeleted: false } } } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks: tasks.map(toTaskDTO), total, page, limit };
};

export const createTaskService = async (
  projectId: string,
  tenantId: string,
  createdById: string,
  data: CreateTaskInput
) => {
  const { assigneeIds = [], ...rest } = data;

  const task = await prisma.task.create({
    data: {
      ...rest,
      // ensure enums have correct types for Prisma
      status: (rest.status as unknown as TaskStatus | undefined) ?? undefined,
      priority: (rest.priority as unknown as Priority | undefined) ?? undefined,
      projectId,
      tenantId,
      createdById,
      assignees: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  const dto = toTaskDTO(task);
  emitToProject(projectId, SOCKET_EVENTS.TASK_CREATED, dto);

  // Notify each assignee
  for (const userId of assigneeIds) {
    if (userId !== createdById) {
      await createNotificationService({
        userId,
        tenantId,
        type: "TASK_ASSIGNED",
        message: `You were assigned to "${task.title}"`,
        linkUrl: `/projects/${projectId}/tasks/${task.id}`,
      });
    }
  }

  return dto;
};

export const updateTaskService = async (
  taskId: string,
  projectId: string,
  tenantId: string,
  actorId: string,
  data: UpdateTaskInput
) => {
  const existing = await assertTaskInProject(taskId, projectId, tenantId);
  const { assigneeIds, status, priority, ...rest } = data;

  const updateData: Prisma.TaskUncheckedUpdateInput = {
    ...rest,
    // ensure enums have correct types for Prisma
    ...(status !== undefined && { status: status as unknown as TaskStatus }),
    ...(priority !== undefined && { priority: priority as unknown as Priority }),
    ...(assigneeIds !== undefined && {
      assignees: {
        deleteMany: {},
        create: assigneeIds.map((userId) => ({ userId })),
      },
    }),
  };

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  const dto = toTaskDTO(updated);
  emitToProject(projectId, SOCKET_EVENTS.TASK_UPDATED, dto);

  // Notify newly added assignees
  if (assigneeIds) {
    const previousAssignees = new Set(
      (await prisma.taskAssignee.findMany({ where: { taskId: existing.id } })).map(
        (a) => a.userId
      )
    );
    for (const userId of assigneeIds) {
      if (!previousAssignees.has(userId) && userId !== actorId) {
        await createNotificationService({
          userId,
          tenantId,
          type: "TASK_ASSIGNED",
          message: `You were assigned to "${updated.title}"`,
          linkUrl: `/projects/${projectId}/tasks/${taskId}`,
        });
      }
    }
  }

  return dto;
};

export const deleteTaskService = async (
  taskId: string,
  projectId: string,
  tenantId: string
) => {
  await assertTaskInProject(taskId, projectId, tenantId);
  const deleted = await prisma.task.update({
    where: { id: taskId },
    data: { isDeleted: true },
  });
  emitToProject(projectId, SOCKET_EVENTS.TASK_DELETED, { id: taskId });
  return deleted;
};
