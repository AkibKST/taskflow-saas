import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  reorderTasksSchema,
} from "./task.model";
import {
  listTasksService,
  createTaskService,
  updateTaskService,
  deleteTaskService,
  reorderTasksService,
  listSubtasksService,
} from "./task.service";
import { listActivityService } from "./activity.service";

const getProjectId = (req: Request) =>
  Array.isArray(req.params.projectId)
    ? req.params.projectId[0]
    : req.params.projectId;

const getTaskId = (req: Request) =>
  Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;

export const listTasks = catchAsync(async (req: Request, res: Response) => {
  const query = listTasksQuerySchema.parse(req.query);
  const result = await listTasksService(getProjectId(req), req.user.tenantId, query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tasks fetched",
    data: result,
  });
});

export const createTask = catchAsync(async (req: Request, res: Response) => {
  const data = createTaskSchema.parse(req.body);
  const task = await createTaskService(
    getProjectId(req),
    req.user.tenantId,
    req.user.userId,
    data
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Task created",
    data: task,
  });
});

export const updateTask = catchAsync(async (req: Request, res: Response) => {
  const data = updateTaskSchema.parse(req.body);
  const task = await updateTaskService(
    getTaskId(req),
    getProjectId(req),
    req.user.tenantId,
    req.user.userId,
    data
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Task updated",
    data: task,
  });
});

export const deleteTask = catchAsync(async (req: Request, res: Response) => {
  await deleteTaskService(getTaskId(req), getProjectId(req), req.user.tenantId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Task deleted",
    data: null,
  });
});

export const listSubtasks = catchAsync(async (req: Request, res: Response) => {
  const subtasks = await listSubtasksService(
    getTaskId(req),
    getProjectId(req),
    req.user.tenantId
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Sub-tasks fetched",
    data: subtasks,
  });
});

export const getActivity = catchAsync(async (req: Request, res: Response) => {
  const activity = await listActivityService(
    getTaskId(req),
    getProjectId(req),
    req.user.tenantId
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Task activity fetched",
    data: activity,
  });
});

export const reorderTasks = catchAsync(async (req: Request, res: Response) => {
  const data = reorderTasksSchema.parse(req.body);
  const result = await reorderTasksService(
    getProjectId(req),
    req.user.tenantId,
    data
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tasks reordered",
    data: result,
  });
});

// ─── Function Summary ──────────────────────────────────────────────────────────
// getProjectId(req) → extracts :projectId param (normalizes array case)
// getTaskId(req)    → extracts :taskId param (normalizes array case)
// listTasks   → GET  /tasks           calls listTasksService, returns paginated list
// createTask  → POST /tasks           validates body, calls createTaskService
// updateTask  → PATCH /tasks/:taskId  validates body, calls updateTaskService
// deleteTask  → DELETE /tasks/:taskId calls deleteTaskService (soft delete)
// reorderTasks→ PATCH /tasks/reorder  validates batch updates, calls reorderTasksService
// ──────────────────────────────────────────────────────────────────────────────
