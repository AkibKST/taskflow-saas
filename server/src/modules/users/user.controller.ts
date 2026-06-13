import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { listUsersService } from "./user.service";

export const listUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await listUsersService(req.user.tenantId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched",
    data: users,
  });
});
