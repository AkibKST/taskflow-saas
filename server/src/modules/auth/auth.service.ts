import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { LoginInput, RegisterInput } from "./auth.model";
import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";

// Helper: generate tokens
const generateTokens = (payload: {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN as any,
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as any,
  });
  return {
    accessToken,
    refreshToken,
  };
};

// Register — create tenant + admin user
export const registerService = async (data: RegisterInput) => {
  // Generate unique slug from org name
  const slug =
    data.orgName.toLowerCase().replace(/[^a-z0-9]/g, "-") +
    "-" +
    Date.now().toString(36);

  // Check if email already exists (globally)
  const existingUser = await prisma.user.findFirst({
    where: { email: data.email },
  });
  if (existingUser) throw new AppError(409, "Email already registered");

  const passwordHash = await bcrypt.hash(data.password, 12);

  // Create tenant + user in transaction
  const result = await prisma.$transaction(async (tx: any) => {
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

  // Save refresh token to DB
  await prisma.refreshToken.create({
    data: {
      userId: result.user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    ...tokens,
    user: result.user,
    tenant: result.tenant,
  };
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
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const { passwordHash: _, ...safeUser } = user;
  return {
    ...tokens,
    user: safeUser,
  };
};

export const logoutService = async (
  refreshToken: string | undefined,
  userId?: string,
) => {
  if (!refreshToken) return; // No token, nothing to revoke

  // Build where clause: always match the token, optionally also match the userId
  const where: { token: string; userId?: string } = { token: refreshToken };
  if (userId) where.userId = userId;

  const result = await prisma.refreshToken.updateMany({
    where,
    data: { isRevoked: true },
  });

  // Optional: log if token wasn't found or already revoked
  if (result.count === 0 && userId) {
    console.warn(
      `Logout attempt with invalid refresh token for user ${userId}`,
    );
  }
};
