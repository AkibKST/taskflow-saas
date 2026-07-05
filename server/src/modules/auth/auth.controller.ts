import { Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import {
  registerService,
  loginService,
  refreshService,
  logoutService,
  updateProfileService,
  changePasswordService,
  forgotPasswordService,
  resetPasswordService,
  verifyEmailService,
  resendVerificationService,
} from "./auth.service";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from "./auth.model";
import AppError from "../../utils/AppError";
import { prisma } from "../../config/prisma";
import crypto from "node:crypto";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// CSRF double-submit cookie: NOT httpOnly — the client must read it and echo
// it back in the X-CSRF-Token header on refresh/logout (see verifyCsrf).
const CSRF_COOKIE_OPTIONS = { ...COOKIE_OPTIONS, httpOnly: false };

const issueCsrfCookie = (res: Response): void => {
  res.cookie("csrfToken", crypto.randomBytes(32).toString("hex"), CSRF_COOKIE_OPTIONS);
};

// Register
export const register = catchAsync(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);
  const result = await registerService(body);

  res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);
  issueCsrfCookie(res);

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
  issueCsrfCookie(res);

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

  // Set the new rotated refresh token as a cookie; rotate the CSRF token too
  res.cookie("refreshToken", tokens.refreshToken, COOKIE_OPTIONS);
  issueCsrfCookie(res);

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
  res.clearCookie("csrfToken", CSRF_COOKIE_OPTIONS);

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

// Update current user's profile (name / email)
export const updateMe = catchAsync(async (req, res) => {
  const body = updateProfileSchema.parse(req.body);
  const user = await updateProfileService(req.user!.userId, body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated",
    data: user,
  });
});

// Change current user's password
export const changePassword = catchAsync(async (req, res) => {
  const body = changePasswordSchema.parse(req.body);
  await changePasswordService(req.user!.userId, body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed",
    data: null,
  });
});

// Forgot password — always responds 200 (no account enumeration)
export const forgotPassword = catchAsync(async (req, res) => {
  const body = forgotPasswordSchema.parse(req.body);
  await forgotPasswordService(body.email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "If an account exists for that email, a reset link has been sent",
    data: null,
  });
});

// Reset password — consume token, set new password
export const resetPassword = catchAsync(async (req, res) => {
  const body = resetPasswordSchema.parse(req.body);
  await resetPasswordService(body.token, body.password);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset successfully. Please sign in.",
    data: null,
  });
});

// Verify email — consume token, mark verified
export const verifyEmail = catchAsync(async (req, res) => {
  const body = verifyEmailSchema.parse(req.body);
  await verifyEmailService(body.token);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email verified successfully",
    data: null,
  });
});

// Resend verification — always responds 200 (no account enumeration)
export const resendVerification = catchAsync(async (req, res) => {
  const body = resendVerificationSchema.parse(req.body);
  await resendVerificationService(body.email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "If your account needs verification, a new link has been sent",
    data: null,
  });
});

// ─── Function Summary ──────────────────────────────────────────────────────────
// register  → POST /auth/register    creates tenant+owner, sets refresh cookie
// login     → POST /auth/login       validates credentials, sets refresh cookie
// refresh   → POST /auth/refresh     rotates refresh token pair via refreshService
// logout    → POST /auth/logout      revokes token, clears cookie
// getMe     → GET  /auth/me          returns current user profile
// ──────────────────────────────────────────────────────────────────────────────
