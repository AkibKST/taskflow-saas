import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from "./auth.model";
import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  tenantId: true,
  tenant: { select: { id: true, name: true, slug: true } },
} as const;

interface TokenPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "15m") as jwt.SignOptions["expiresIn"],
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"],
  });
  return { accessToken, refreshToken };
};

const saveRefreshToken = (userId: string, token: string) =>
  prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

// Register — create tenant + admin user
export const registerService = async (data: RegisterInput) => {
  const slug =
    data.orgName.toLowerCase().replace(/[^a-z0-9]/g, "-") +
    "-" +
    Date.now().toString(36);

  const existingUser = await prisma.user.findFirst({
    where: { email: data.email },
  });
  if (existingUser) throw new AppError(409, "Email already registered");

  const passwordHash = await bcrypt.hash(data.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: data.orgName, slug },
    });
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
        email: data.email,
        passwordHash,
        role: "OWNER",
      },
      select: { id: true, name: true, email: true, role: true, tenantId: true },
    });
    return { tenant, user };
  });

  const tokens = generateTokens({
    userId: result.user.id,
    tenantId: result.tenant.id,
    role: result.user.role,
    email: result.user.email,
  });

  await saveRefreshToken(result.user.id, tokens.refreshToken);

  return { ...tokens, user: result.user, tenant: result.tenant };
};

// Login
export const loginService = async (data: LoginInput) => {
  const user = await prisma.user.findFirst({
    where: { email: data.email, isActive: true },
    include: { tenant: { select: { id: true, name: true, slug: true } } },
  });
  if (!user) throw new AppError(401, "Invalid email or password");

  const isValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isValid) throw new AppError(401, "Invalid email or password");

  const tokens = generateTokens({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  });

  await saveRefreshToken(user.id, tokens.refreshToken);

  const { passwordHash: _, ...safeUser } = user;
  return { ...tokens, user: safeUser };
};

// Refresh — rotate the refresh token on every use; detect replay attacks
export const refreshService = async (oldToken: string) => {
  const stored = await prisma.refreshToken.findUnique({ where: { token: oldToken } });

  if (!stored) throw new AppError(401, "Invalid refresh token");

  if (stored.isRevoked) {
    // Reuse of a revoked token: someone is replaying a stolen token.
    // Revoke the entire token family for this user to force re-login.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, isRevoked: false },
      data: { isRevoked: true },
    });
    throw new AppError(401, "Refresh token reuse detected — please log in again");
  }

  if (stored.expiresAt < new Date()) throw new AppError(401, "Refresh token expired");

  const payload = jwt.verify(
    oldToken,
    process.env.JWT_REFRESH_SECRET!
  ) as TokenPayload;

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { isRevoked: true },
  });

  // Issue new token pair
  const newTokens = generateTokens({
    userId: payload.userId,
    tenantId: payload.tenantId,
    role: payload.role,
    email: payload.email,
  });

  await saveRefreshToken(payload.userId, newTokens.refreshToken);

  return newTokens;
};

// Update own profile (name / email)
export const updateProfileService = async (
  userId: string,
  data: UpdateProfileInput
) => {
  if (data.email) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: userId } },
    });
    if (existing) throw new AppError(409, "Email already in use");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
    },
    select: PROFILE_SELECT,
  });

  return user;
};

// Change own password (verifies the current password first)
export const changePasswordService = async (
  userId: string,
  data: ChangePasswordInput
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found");

  const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!isValid) throw new AppError(400, "Current password is incorrect");

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
};

// Logout
export const logoutService = async (
  refreshToken: string | undefined,
  userId?: string
) => {
  if (!refreshToken) return;

  const where: { token: string; userId?: string } = { token: refreshToken };
  if (userId) where.userId = userId;

  const result = await prisma.refreshToken.updateMany({
    where,
    data: { isRevoked: true },
  });

  if (result.count === 0 && userId) {
    console.warn(`Logout attempt with invalid refresh token for user ${userId}`);
  }
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// generateTokens(payload)       → creates signed access + refresh JWT pair
// saveRefreshToken(userId, tok) → persists refresh token to DB with 7-day TTL
// registerService(data)         → creates Tenant + OWNER User in transaction, issues tokens
// loginService(data)            → validates credentials, issues tokens
// refreshService(oldToken)      → rotates refresh token (revoke old, issue new);
//                                  detects replay attack and revokes full token family
// logoutService(refreshToken, userId) → revokes the stored refresh token
// ──────────────────────────────────────────────────────────────────────────────
