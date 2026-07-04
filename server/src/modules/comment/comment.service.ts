import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";
import { SOCKET_EVENTS, NOTIFICATION_TYPES, PAGINATION } from "@taskflow/shared";
import { emitToProject } from "../../socket";
import { createNotificationService } from "../notification/notification.service";
import { parseMentions } from "../../utils/mentions";
import { CreateCommentInput, UpdateCommentInput } from "./comment.model";

// Socket event names for comments (single source of truth in @taskflow/shared)
export const COMMENT_EVENTS = {
  CREATED: SOCKET_EVENTS.COMMENT_CREATED,
  UPDATED: SOCKET_EVENTS.COMMENT_UPDATED,
  DELETED: SOCKET_EVENTS.COMMENT_DELETED,
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

  // Return the most recent page of comments in chronological order. Capped so a
  // hot task can't return an unbounded list; the client can request older pages.
  const limit = PAGINATION.MAX_LIMIT;
  const recent = await prisma.comment.findMany({
    where: { taskId, isDeleted: false },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return recent.reverse();
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
      project: {
        select: {
          members: {
            select: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
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

  const link = `/projects/${task.projectId}/tasks/${taskId}`;

  // Resolve @mentions against project members; these get a MENTIONED notice.
  const projectMembers = task.project.members.map((m) => m.user);
  const mentionedIds = parseMentions(data.content, projectMembers).filter(
    (uid) => uid !== userId
  );
  const mentioned = new Set(mentionedIds);

  // Assignees (minus the commenter, minus anyone already @mentioned) get a
  // TASK_COMMENTED notice so mentions aren't doubled up.
  const commentedIds = task.assignees
    .map((a) => a.userId)
    .filter((uid) => uid !== userId && !mentioned.has(uid));

  await Promise.all([
    ...mentionedIds.map((uid) =>
      createNotificationService({
        userId: uid,
        tenantId,
        type: NOTIFICATION_TYPES.MENTIONED,
        message: `${comment.user.name} mentioned you on "${task.title}"`,
        linkUrl: link,
      })
    ),
    ...commentedIds.map((uid) =>
      createNotificationService({
        userId: uid,
        tenantId,
        type: NOTIFICATION_TYPES.TASK_COMMENTED,
        message: `New comment on "${task.title}"`,
        linkUrl: link,
      })
    ),
  ]);

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
