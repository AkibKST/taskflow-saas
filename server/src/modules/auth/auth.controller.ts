import { Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import {
  registerService,
  loginService,
  refreshService,
  logoutService,
} from "./auth.service";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { loginSchema, registerSchema } from "./auth.model";
import AppError from "../../utils/AppError";
import { prisma } from "../../config/prisma";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Register
export const register = catchAsync(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);
  const result = await registerService(body);

  res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Registration successful",
    data: {
      accessToken: result.accessToken,
      user: result.user,
      tenant: result.tenant,
    },
  });
});

// Login
export const login = catchAsync(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await loginService(body);

  res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login successful",
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

// Refresh — rotates the refresh token and issues a new pair
export const refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError(401, "Refresh token not found");

  const tokens = await refreshService(token);

  // Set the new rotated refresh token as a cookie
  res.cookie("refreshToken", tokens.refreshToken, COOKIE_OPTIONS);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Token refreshed",
    data: { accessToken: tokens.accessToken },
  });
});

// Logout
export const logout = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  await logoutService(refreshToken, req.user?.userId);
  res.clearCookie("refreshToken", COOKIE_OPTIONS);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

// Get current user
export const getMe = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenantId: true,
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!user) throw new AppError(404, "User not found");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User fetched",
    data: user,
  });
});

// ─── Function Summary ──────────────────────────────────────────────────────────
// register  → POST /auth/register    creates tenant+owner, sets refresh cookie
// login     → POST /auth/login       validates credentials, sets refresh cookie
// refresh   → POST /auth/refresh     rotates refresh token pair via refreshService
// logout    → POST /auth/logout      revokes token, clears cookie
// getMe     → GET  /auth/me          returns current user profile
// ──────────────────────────────────────────────────────────────────────────────
