import crypto from "crypto";
import path from "path";
import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";
import { storage } from "../../utils/storage";
import { recordActivity, TASK_ACTIVITY } from "./activity.service";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB

const assertTask = async (taskId: string, projectId: string, tenantId: string) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId, tenantId, isDeleted: false },
    select: { id: true },
  });
  if (!task) throw new AppError(404, "Task not found");
  return task;
};

export const listAttachmentsService = async (
  taskId: string,
  projectId: string,
  tenantId: string
) => {
  await assertTask(taskId, projectId, tenantId);
  return prisma.attachment.findMany({
    where: { taskId },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const uploadAttachmentService = async (opts: {
  taskId: string;
  projectId: string;
  tenantId: string;
  userId: string;
  filename: string;
  contentType: string;
  body: Buffer;
}) => {
  await assertTask(opts.taskId, opts.projectId, opts.tenantId);

  if (!opts.body || opts.body.length === 0)
    throw new AppError(400, "Empty file");
  if (opts.body.length > MAX_ATTACHMENT_BYTES)
    throw new AppError(413, "File exceeds the 25MB limit");

  const safeName = path.basename(opts.filename || "file").slice(0, 200);
  const key = `${opts.tenantId}/${opts.taskId}/${crypto.randomUUID()}-${safeName}`;

  await storage.put(key, opts.body, opts.contentType || "application/octet-stream");

  const attachment = await prisma.attachment.create({
    data: {
      taskId: opts.taskId,
      tenantId: opts.tenantId,
      uploadedById: opts.userId,
      filename: safeName,
      contentType: opts.contentType || "application/octet-stream",
      sizeBytes: opts.body.length,
      storageKey: key,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });

  await recordActivity(opts.taskId, opts.userId, TASK_ACTIVITY.ATTACHMENT_ADDED, {
    filename: safeName,
  });

  return attachment;
};

// Load attachment metadata scoped to the project/tenant (authorization guard).
export const getAttachmentForDownload = async (
  attachmentId: string,
  projectId: string,
  tenantId: string
) => {
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, tenantId, task: { projectId } },
  });
  if (!attachment) throw new AppError(404, "Attachment not found");

  const url = await storage.url(attachment.storageKey);
  return { attachment, url };
};

export const deleteAttachmentService = async (
  attachmentId: string,
  projectId: string,
  tenantId: string,
  userId: string
) => {
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, tenantId, task: { projectId } },
  });
  if (!attachment) throw new AppError(404, "Attachment not found");

  await storage.remove(attachment.storageKey).catch(() => undefined);
  await prisma.attachment.delete({ where: { id: attachmentId } });
  await recordActivity(attachment.taskId, userId, TASK_ACTIVITY.ATTACHMENT_REMOVED, {
    filename: attachment.filename,
  });
};
