import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { searchService } from "./search.service";

export const search = catchAsync(async (req: Request, res: Response) => {
  const results = await searchService({
    q: String(req.query.q ?? ""),
    tenantId: req.user.tenantId,
    userId: req.user.userId,
    role: req.user.role,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Search results",
    data: results,
  });
});
