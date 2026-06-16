import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { createInviteSchema, acceptInviteSchema } from "./invite.model";
import {
  createInviteService,
  validateInviteService,
  acceptInviteService,
} from "./invite.service";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const createInvite = catchAsync(async (req: Request, res: Response) => {
  const data = createInviteSchema.parse(req.body);
  const invite = await createInviteService(req.user.tenantId, req.user.userId, data);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Invite sent successfully",
    data: invite,
  });
});

export const validateInvite = catchAsync(async (req: Request, res: Response) => {
  const info = await validateInviteService(String(req.params.token));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Invite is valid",
    data: info,
  });
});

export const acceptInvite = catchAsync(async (req: Request, res: Response) => {
  const data = acceptInviteSchema.parse(req.body);
  const result = await acceptInviteService(String(req.params.token), data);

  res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Invite accepted — welcome to the workspace!",
    data: {
      accessToken: result.accessToken,
      user: result.user,
      tenant: result.tenant,
    },
  });
});

// ─── Function Summary ──────────────────────────────────────────────────────────
// createInvite  → POST /invite          validates body, calls createInviteService
// validateInvite→ GET  /invite/:token   looks up token, returns invite metadata
// acceptInvite  → POST /invite/:token/accept  creates account, sets refresh cookie
// ──────────────────────────────────────────────────────────────────────────────
