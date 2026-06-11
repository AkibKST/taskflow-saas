import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
} from "./task.model";
import {
  listTasksService,
  createTaskService,
  updateTaskService,
  deleteTaskService,
} from "./task.service";

export const listTasks = catchAsync(async (req: Request, res: Response) => {
  const query = listTasksQuerySchema.parse(req.query);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const result = await listTasksService(
    projectId,
    req.user.tenantId,
    query
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Tasks fetched", data: result });
});

export const createTask = catchAsync(async (req: Request, res: Response) => {
  const data = createTaskSchema.parse(req.body);
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const task = await createTaskService(
    projectId,
    req.user.tenantId,
    req.user.userId,
    data
  );
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Task created", data: task });
});

export const updateTask = catchAsync(async (req: Request, res: Response) => {
  const data = updateTaskSchema.parse(req.body);
  const taskId = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const task = await updateTaskService(
    taskId,
    projectId,
    req.user.tenantId,
    req.user.userId,
    data
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Task updated", data: task });
});

export const deleteTask = catchAsync(async (req: Request, res: Response) => {
  const taskId = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  await deleteTaskService(
    taskId,
    projectId,
    req.user.tenantId
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Task deleted", data: null });
});
