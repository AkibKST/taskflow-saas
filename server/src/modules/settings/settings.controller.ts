import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import {
  getNotificationPrefsService,
  updateNotificationPrefsService,
  getWorkspaceService,
  updateWorkspaceService,
} from "./settings.service";
import {
  updateNotificationPrefsSchema,
  updateWorkspaceSchema,
} from "./settings.model";

export const getNotificationPrefs = catchAsync(async (req, res) => {
  const prefs = await getNotificationPrefsService(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification preferences fetched",
    data: prefs,
  });
});

export const updateNotificationPrefs = catchAsync(async (req, res) => {
  const body = updateNotificationPrefsSchema.parse(req.body);
  const prefs = await updateNotificationPrefsService(req.user!.userId, body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification preferences saved",
    data: prefs,
  });
});

export const getWorkspace = catchAsync(async (req, res) => {
  const workspace = await getWorkspaceService(req.user!.tenantId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Workspace settings fetched",
    data: workspace,
  });
});

export const updateWorkspace = catchAsync(async (req, res) => {
  const body = updateWorkspaceSchema.parse(req.body);
  const workspace = await updateWorkspaceService(req.user!.tenantId, body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Workspace settings saved",
    data: workspace,
  });
});
