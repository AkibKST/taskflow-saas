import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import {
  listNotificationsService,
  markReadService,
  markAllReadService,
} from "./notification.service";

export const listNotifications = catchAsync(
  async (req: Request, res: Response) => {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await listNotificationsService(
      req.user.userId,
      req.user.tenantId,
      { page, limit }
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Notifications fetched",
      // `data` stays the array for client compatibility; pagination + unread
      // count travel in `meta`.
      data: result.items,
      meta: { ...result.pagination, unread: result.unread },
    });
  }
);

export const markRead = catchAsync(async (req: Request, res: Response) => {
  await markReadService(String(req.params.notificationId), req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
    data: null,
  });
});

export const markAllRead = catchAsync(async (req: Request, res: Response) => {
  await markAllReadService(req.user.userId, req.user.tenantId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All notifications marked as read",
    data: null,
  });
});
