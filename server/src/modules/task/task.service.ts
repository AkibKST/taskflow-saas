import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";
import { Prisma } from "../../generated/prisma/client";
import type { TaskStatus, Priority } from "../../generated/prisma/client";
import { SOCKET_EVENTS, NOTIFICATION_TYPES } from "@taskflow/shared";
import { emitToProject } from "../../socket";
import { createNotificationService } from "../notification/notification.service";
import {
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksQuery,
  ReorderTasksInput,
} from "./task.model";

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

  const where: Prisma.TaskWhereInput = { projectId, tenantId, isDeleted: false };
  if (status) where.status = status as TaskStatus;
  if (priority) where.priority = priority as Priority;
  if (assigneeId) where.assignees = { some: { userId: assigneeId } };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignees: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
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
      status: (rest.status as TaskStatus | undefined) ?? undefined,
      priority: (rest.priority as Priority | undefined) ?? undefined,
      projectId,
      tenantId,
      createdById,
      assignees: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
    include: {
      assignees: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });

  const dto = toTaskDTO(task);
  emitToProject(projectId, SOCKET_EVENTS.TASK_CREATED, dto);

  // Batch-notify assignees in parallel instead of serial awaits
  await Promise.all(
    assigneeIds
      .filter((userId) => userId !== createdById)
      .map((userId) =>
        createNotificationService({
          userId,
          tenantId,
          type: NOTIFICATION_TYPES.TASK_ASSIGNED,
          message: `You were assigned to "${task.title}"`,
          linkUrl: `/projects/${projectId}/tasks/${task.id}`,
        })
      )
  );

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
    ...(status !== undefined && { status: status as TaskStatus }),
    ...(priority !== undefined && { priority: priority as Priority }),
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
      assignees: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });

  const dto = toTaskDTO(updated);
  emitToProject(projectId, SOCKET_EVENTS.TASK_UPDATED, dto);

  // Notify newly added assignees (batch, in parallel)
  if (assigneeIds) {
    const previousAssigneeIds = new Set(
      existing
        ? (
            await prisma.taskAssignee.findMany({
              where: { taskId: existing.id },
              select: { userId: true },
            })
          ).map((a) => a.userId)
        : []
    );
    await Promise.all(
      assigneeIds
        .filter((userId) => !previousAssigneeIds.has(userId) && userId !== actorId)
        .map((userId) =>
          createNotificationService({
            userId,
            tenantId,
            type: NOTIFICATION_TYPES.TASK_ASSIGNED,
            message: `You were assigned to "${updated.title}"`,
            linkUrl: `/projects/${projectId}/tasks/${taskId}`,
          })
        )
    );
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

// Batch reorder: replace N parallel PATCH requests with one atomic write.
// Only tasks that belong to the project+tenant are updated.
export const reorderTasksService = async (
  projectId: string,
  tenantId: string,
  input: ReorderTasksInput
) => {
  const { updates } = input;

  // Verify all task ids belong to this project (security check)
  const ids = updates.map((u) => u.id);
  const existing = await prisma.task.findMany({
    where: { id: { in: ids }, projectId, tenantId, isDeleted: false },
    select: { id: true },
  });
  const validIds = new Set(existing.map((t) => t.id));
  const invalid = ids.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    throw new AppError(400, `Task(s) not found in this project: ${invalid.join(", ")}`);
  }

  // Execute all updates in a single transaction
  await prisma.$transaction(
    updates.map((u) =>
      prisma.task.update({
        where: { id: u.id },
        data: {
          order: u.order,
          ...(u.status !== undefined && { status: u.status as TaskStatus }),
        },
      })
    )
  );

  // Emit one consolidated batch event so clients can reconcile
  emitToProject(projectId, SOCKET_EVENTS.TASK_UPDATED, {
    _batchReorder: true,
    updates: updates.map((u) => ({ id: u.id, order: u.order, status: u.status })),
  });

  return { updated: updates.length };
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// assertTaskInProject(taskId, projectId, tenantId)
//   → guard: throws 404 if task not found in project+tenant scope
//
// toTaskDTO(task) → reshapes Prisma task into client-friendly DTO (flat assignees)
//
// listTasksService(projectId, tenantId, query)
//   → paginated, filterable task list for a project
//
// createTaskService(projectId, tenantId, createdById, data)
//   → creates task + assignees, emits TASK_CREATED, batch-notifies assignees
//
// updateTaskService(taskId, projectId, tenantId, actorId, data)
//   → updates task fields + assignees, emits TASK_UPDATED, notifies new assignees
//
// deleteTaskService(taskId, projectId, tenantId)
//   → soft-deletes task, emits TASK_DELETED
//
// reorderTasksService(projectId, tenantId, input)
//   → batch-updates order/status for multiple tasks in one DB transaction,
//     emits a single TASK_UPDATED batch event; replaces N parallel PATCH calls
// ──────────────────────────────────────────────────────────────────────────────
