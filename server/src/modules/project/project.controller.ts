import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
} from "./project.model";
import {
  listProjectsService,
  getProjectService,
  createProjectService,
  updateProjectService,
  deleteProjectService,
  addMemberService,
  removeMemberService,
} from "./project.service";
import { parsePagination, buildMeta } from "../../utils/pagination";

export const listProjects = catchAsync(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query);
  const { items, total } = await listProjectsService(req.user.tenantId, pagination);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Projects fetched",
    data: items,
    meta: buildMeta(total, pagination),
  });
});

export const getProject = catchAsync(async (req: Request, res: Response) => {
  const project = await getProjectService(String(req.params.projectId), req.user.tenantId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Project fetched", data: project });
});

export const createProject = catchAsync(async (req: Request, res: Response) => {
  const data = createProjectSchema.parse(req.body);
  const project = await createProjectService(req.user.tenantId, req.user.userId, data);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Project created", data: project });
});

export const updateProject = catchAsync(async (req: Request, res: Response) => {
  const data = updateProjectSchema.parse(req.body);
  const project = await updateProjectService(String(req.params.projectId), req.user.tenantId, data);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Project updated", data: project });
});

export const deleteProject = catchAsync(async (req: Request, res: Response) => {
  await deleteProjectService(String(req.params.projectId), req.user.tenantId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Project deleted", data: null });
});

export const addMember = catchAsync(async (req: Request, res: Response) => {
  const data = addMemberSchema.parse(req.body);
  const member = await addMemberService(String(req.params.projectId), req.user.tenantId, data);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Member added", data: member });
});

export const removeMember = catchAsync(async (req: Request, res: Response) => {
  await removeMemberService(String(req.params.projectId), req.user.tenantId, String(req.params.userId));
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Member removed", data: null });
});
