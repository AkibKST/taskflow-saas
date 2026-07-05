import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { dashboardSummaryService } from "./dashboard.service";

export const getSummary = catchAsync(async (req: Request, res: Response) => {
  const summary = await dashboardSummaryService(
    req.user.userId,
    req.user.tenantId,
    req.user.role
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard summary fetched",
    data: summary,
  });
});

// ─── Function Summary ──────────────────────────────────────────────────────────
// getSummary → GET /dashboard/summary  aggregates for the dashboard page
// ──────────────────────────────────────────────────────────────────────────────
