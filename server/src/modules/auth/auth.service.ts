import crypto from "crypto";
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
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../../utils/email";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

// Issue (or re-issue) an email-verification token and send the link.
// Invalidates any prior unused token for the user first.
export const issueEmailVerification = async (userId: string, email: string) => {
  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
    },
  });

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await sendVerificationEmail({ to: email, verifyUrl });
};

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

  // Best-effort: a failed verification email must not fail registration.
  await issueEmailVerification(result.user.id, result.user.email).catch((e) =>
    console.error("[AUTH] issueEmailVerification failed:", e)
  );

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

// Update own profile (name / email). Changing the email is a sensitive action:
// it requires the current password, marks the account unverified again, and
// re-issues a verification email to the new address.
export const updateProfileService = async (
  userId: string,
  data: UpdateProfileInput
) => {
  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) throw new AppError(404, "User not found");

  const emailChanging =
    data.email !== undefined && data.email !== current.email;

  if (emailChanging) {
    const ok = await bcrypt.compare(data.currentPassword ?? "", current.passwordHash);
    if (!ok) throw new AppError(400, "Current password is incorrect");

    // Global email identity — an email maps to one account across all tenants.
    const existing = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: userId } },
    });
    if (existing) throw new AppError(409, "Email already in use");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(emailChanging && {
        email: data.email,
        emailVerifiedAt: null,
      }),
    },
    select: PROFILE_SELECT,
  });

  if (emailChanging) {
    await issueEmailVerification(userId, data.email!).catch((e) =>
      console.error("[AUTH] re-verification after email change failed:", e)
    );
  }

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

// Forgot password — issue a reset token + email. Never reveals whether the
// email exists (returns silently either way) to avoid account enumeration.
export const forgotPasswordService = async (email: string) => {
  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
  });
  if (!user) return;

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  // Best-effort: a delivery failure must not reveal whether the email exists.
  await sendPasswordResetEmail({ to: user.email, resetUrl }).catch((e) =>
    console.error("[AUTH] sendPasswordResetEmail failed:", e)
  );
};

// Reset password — consume a valid token, set the new password, and revoke all
// refresh tokens so every existing session is forced to re-authenticate.
export const resetPasswordService = async (token: string, newPassword: string) => {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError(400, "Invalid or expired reset link");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, isRevoked: false },
      data: { isRevoked: true },
    }),
  ]);
};

// Verify email — consume a valid token and stamp the user as verified.
export const verifyEmailService = async (token: string) => {
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError(400, "Invalid or expired verification link");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
};

// Resend verification — silent no-op if the account is missing or already verified.
export const resendVerificationService = async (email: string) => {
  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
  });
  if (!user || user.emailVerifiedAt) return;
  await issueEmailVerification(user.id, user.email);
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
