import { Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { registerService, loginService } from "./auth.service";
import jwt from "jsonwebtoken";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { loginSchema, registerSchema } from "./auth.model";
import AppError from "../../utils/AppError";
import { prisma } from "../../config/prisma";
import { AuthPayload } from "../../middleware/verifyToken";

// Cookie options
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

//Refresh token
export const refresh = catchAsync(async (req, res) => {
  // Get token from cookies
  const token = req.cookies?.refreshToken;

  // If no token, return 401
  if (!token) {
    throw new AppError(401, "Refresh token not found");
  }

  // Check if token is valid and not revoked
  const stored = await prisma.refreshToken.findUnique({
    where: {
      token,
    },
  });

  if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
    throw new AppError(401, "Invalid refresh token");
  }

  // Generate new access token
  const payload = jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET!,
  ) as AuthPayload;
  const accessToken = jwt.sign(
    {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN as any },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Token refreshed",
    data: {
      accessToken: accessToken,
    },
  });
});

// Logout
export const logout = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token)
    await prisma.refreshToken.updateMany({
      where: {
        token,
      },
      data: {
        isRevoked: true,
      },
    });

  // Clear cookie
  res.clearCookie("refreshToken");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

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
  if (!user) {
    throw new AppError(404, "User not found");
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User fetched",
    data: user,
  });
});
