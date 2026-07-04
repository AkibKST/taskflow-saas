import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { storage } from "../../utils/storage";
import {
  listAttachmentsService,
  uploadAttachmentService,
  getAttachmentForDownload,
  deleteAttachmentService,
} from "./attachment.service";

// mergeParams gives :projectId and :taskId from the parent routers.
const params = (req: Request) => ({
  projectId: String(req.params.projectId),
  taskId: String(req.params.taskId),
  tenantId: req.user.tenantId,
});

export const listAttachments = catchAsync(async (req: Request, res: Response) => {
  const p = params(req);
  const data = await listAttachmentsService(p.taskId, p.projectId, p.tenantId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attachments fetched",
    data,
  });
});

export const uploadAttachment = catchAsync(async (req: Request, res: Response) => {
  const p = params(req);
  const filename =
    (req.headers["x-filename"] as string) || String(req.query.filename ?? "file");
  const attachment = await uploadAttachmentService({
    ...p,
    userId: req.user.userId,
    filename,
    contentType: req.headers["content-type"] || "application/octet-stream",
    body: req.body as Buffer,
  });
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Attachment uploaded",
    data: attachment,
  });
});

export const downloadAttachment = catchAsync(async (req: Request, res: Response) => {
  const { attachment, url } = await getAttachmentForDownload(
    String(req.params.attachmentId),
    String(req.params.projectId),
    req.user.tenantId
  );

  // S3 with a public/CDN base → redirect; otherwise stream the bytes.
  if (url) return res.redirect(url);

  const buffer = await storage.get(attachment.storageKey);
  res.setHeader("Content-Type", attachment.contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(attachment.filename)}"`
  );
  res.send(buffer);
});

export const deleteAttachment = catchAsync(async (req: Request, res: Response) => {
  await deleteAttachmentService(
    String(req.params.attachmentId),
    String(req.params.projectId),
    req.user.tenantId,
    req.user.userId
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attachment deleted",
    data: null,
  });
});
