import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";
import { SOCKET_EVENTS, NOTIFICATION_TYPES } from "@taskflow/shared";
import { emitToProject } from "../../socket";
import { createNotificationService } from "../notification/notification.service";
import { CreateCommentInput, UpdateCommentInput } from "./comment.model";

// Socket event names for comments (extend SOCKET_EVENTS constants in shared if desired)
export const COMMENT_EVENTS = {
  CREATED: "comment:created",
  UPDATED: "comment:updated",
  DELETED: "comment:deleted",
} as const;

const assertCommentOwnership = async (
  commentId: string,
  userId: string,
  tenantId: string
) => {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, userId, isDeleted: false },
    include: { task: { select: { id: true, projectId: true, tenantId: true, title: true } } },
  });
  if (!comment) throw new AppError(404, "Comment not found or you are not the author");
  if (comment.task.tenantId !== tenantId)
    throw new AppError(403, "Access denied");
  return comment;
};

export const listCommentsService = async (taskId: string, tenantId: string) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId, isDeleted: false },
    select: { id: true },
  });
  if (!task) throw new AppError(404, "Task not found");

  return prisma.comment.findMany({
    where: { taskId, isDeleted: false },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
};

export const createCommentService = async (
  taskId: string,
  tenantId: string,
  userId: string,
  data: CreateCommentInput
) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId, isDeleted: false },
    include: {
      assignees: { select: { userId: true } },
    },
  });
  if (!task) throw new AppError(404, "Task not found");

  const comment = await prisma.comment.create({
    data: {
      taskId,
      userId,
      content: data.content,
      parentId: data.parentId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  emitToProject(task.projectId, COMMENT_EVENTS.CREATED, { taskId, comment });

  // Notify all task assignees (except the commenter)
  const notifyIds = task.assignees
    .map((a) => a.userId)
    .filter((uid) => uid !== userId);

  await Promise.all(
    notifyIds.map((uid) =>
      createNotificationService({
        userId: uid,
        tenantId,
        type: NOTIFICATION_TYPES.TASK_COMMENTED,
        message: `New comment on "${task.title}"`,
        linkUrl: `/projects/${task.projectId}/tasks/${taskId}`,
      })
    )
  );

  return comment;
};

export const updateCommentService = async (
  commentId: string,
  userId: string,
  tenantId: string,
  data: UpdateCommentInput
) => {
  const existing = await assertCommentOwnership(commentId, userId, tenantId);

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content: data.content, isEdited: true },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  emitToProject(existing.task.projectId, COMMENT_EVENTS.UPDATED, {
    taskId: existing.taskId,
    comment: updated,
  });

  return updated;
};

export const deleteCommentService = async (
  commentId: string,
  userId: string,
  tenantId: string
) => {
  const existing = await assertCommentOwnership(commentId, userId, tenantId);

  await prisma.comment.update({
    where: { id: commentId },
    data: { isDeleted: true },
  });

  emitToProject(existing.task.projectId, COMMENT_EVENTS.DELETED, {
    taskId: existing.taskId,
    commentId,
  });
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// assertCommentOwnership(commentId, userId, tenantId)
//   → guard: throws 404 if comment not found or caller is not the author
//
// listCommentsService(taskId, tenantId)
//   → returns all non-deleted comments on a task, ordered by createdAt asc
//
// createCommentService(taskId, tenantId, userId, data)
//   → creates comment, emits comment:created to project room,
//     notifies task assignees via TASK_COMMENTED notification
//
// updateCommentService(commentId, userId, tenantId, data)
//   → verifies ownership, updates content, marks isEdited, emits comment:updated
//
// deleteCommentService(commentId, userId, tenantId)
//   → verifies ownership, soft-deletes, emits comment:deleted
// ──────────────────────────────────────────────────────────────────────────────
