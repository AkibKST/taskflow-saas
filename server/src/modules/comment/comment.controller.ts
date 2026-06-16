import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { createCommentSchema, updateCommentSchema } from "./comment.model";
import {
  listCommentsService,
  createCommentService,
  updateCommentService,
  deleteCommentService,
} from "./comment.service";

export const listComments = catchAsync(async (req: Request, res: Response) => {
  const taskId = String(req.params.taskId);
  const comments = await listCommentsService(taskId, req.user.tenantId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comments fetched",
    data: comments,
  });
});

export const createComment = catchAsync(async (req: Request, res: Response) => {
  const data = createCommentSchema.parse(req.body);
  const taskId = String(req.params.taskId);
  const comment = await createCommentService(
    taskId,
    req.user.tenantId,
    req.user.userId,
    data
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Comment posted",
    data: comment,
  });
});

export const updateComment = catchAsync(async (req: Request, res: Response) => {
  const data = updateCommentSchema.parse(req.body);
  const comment = await updateCommentService(
    String(req.params.commentId),
    req.user.userId,
    req.user.tenantId,
    data
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment updated",
    data: comment,
  });
});

export const deleteComment = catchAsync(async (req: Request, res: Response) => {
  await deleteCommentService(
    String(req.params.commentId),
    req.user.userId,
    req.user.tenantId
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment deleted",
    data: null,
  });
});

// ─── Function Summary ──────────────────────────────────────────────────────────
// listComments   → GET    /tasks/:taskId/comments              lists all comments on a task
// createComment  → POST   /tasks/:taskId/comments              posts a new comment
// updateComment  → PATCH  /tasks/:taskId/comments/:commentId   edits comment content
// deleteComment  → DELETE /tasks/:taskId/comments/:commentId   soft-deletes comment
// ──────────────────────────────────────────────────────────────────────────────
