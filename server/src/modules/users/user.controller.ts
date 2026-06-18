import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import {
  listUsersService,
  listManagedUsersService,
  updateUserRoleService,
  setUserActiveService,
} from "./user.service";
import { updateRoleSchema, setStatusSchema } from "./user.model";

export const listUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await listUsersService(req.user.tenantId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched",
    data: users,
  });
});

export const listManagedUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await listManagedUsersService(req.user.tenantId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched",
    data: users,
  });
});

export const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const { role } = updateRoleSchema.parse(req.body);
  const user = await updateUserRoleService(req.user, String(req.params.userId), role);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role updated",
    data: user,
  });
});

export const setUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { isActive } = setStatusSchema.parse(req.body);
  const user = await setUserActiveService(req.user, String(req.params.userId), isActive);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: isActive ? "User activated" : "User deactivated",
    data: user,
  });
});
