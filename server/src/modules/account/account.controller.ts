import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { writeAudit, AUDIT } from "../../utils/audit";
import {
  exportTenantDataService,
  deleteTenantService,
  deleteOwnAccountService,
} from "./account.service";

export const exportTenantData = catchAsync(async (req: Request, res: Response) => {
  const data = await exportTenantDataService(req.user.tenantId);
  await writeAudit({
    tenantId: req.user.tenantId,
    actorId: req.user.userId,
    action: AUDIT.TENANT_EXPORTED,
  });
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="taskflow-export-${Date.now()}.json"`
  );
  res.status(httpStatus.OK).send(JSON.stringify(data, null, 2));
});

export const deleteWorkspace = catchAsync(async (req: Request, res: Response) => {
  await deleteTenantService(
    req.user.tenantId,
    req.user.userId,
    String(req.body?.confirm ?? "")
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Workspace permanently deleted",
    data: null,
  });
});

export const deleteOwnAccount = catchAsync(async (req: Request, res: Response) => {
  await deleteOwnAccountService(
    req.user.userId,
    req.user.tenantId,
    String(req.body?.password ?? "")
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your account has been deleted",
    data: null,
  });
});
