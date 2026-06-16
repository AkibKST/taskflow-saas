import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";
import { sendInviteEmail } from "../../utils/email";
import { CreateInviteInput, AcceptInviteInput } from "./invite.model";

const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

export const createInviteService = async (
  tenantId: string,
  invitedById: string,
  data: CreateInviteInput
) => {
  const [tenant, inviter] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.user.findUnique({ where: { id: invitedById }, select: { name: true } }),
  ]);
  if (!tenant) throw new AppError(404, "Tenant not found");

  const existing = await prisma.user.findFirst({
    where: { tenantId, email: data.email },
  });
  if (existing) throw new AppError(409, "User is already a member of this workspace");

  // Cancel any previous pending invite for the same email in this tenant
  await prisma.inviteToken.updateMany({
    where: { tenantId, email: data.email, isAccepted: false },
    data: { isAccepted: true },
  });

  const token = crypto.randomBytes(32).toString("hex");

  const invite = await prisma.inviteToken.create({
    data: {
      tenantId,
      email: data.email,
      role: data.role as any,
      invitedById,
      token,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  const inviteUrl = `${process.env.CLIENT_URL}/invite/${token}`;
  await sendInviteEmail({
    to: data.email,
    inviterName: inviter?.name ?? "A teammate",
    tenantName: tenant.name,
    inviteUrl,
  });

  return { id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt };
};

export const validateInviteService = async (token: string) => {
  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: {
      tenant: { select: { id: true, name: true } },
      invitedBy: { select: { name: true } },
    },
  });

  if (!invite) throw new AppError(404, "Invite link not found");
  if (invite.isAccepted) throw new AppError(410, "This invite has already been used");
  if (invite.expiresAt < new Date()) throw new AppError(410, "Invite has expired");

  return {
    email: invite.email,
    role: invite.role,
    tenantName: invite.tenant.name,
    inviterName: invite.invitedBy.name,
  };
};

export const acceptInviteService = async (
  token: string,
  data: AcceptInviteInput
) => {
  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!invite) throw new AppError(404, "Invite link not found");
  if (invite.isAccepted) throw new AppError(410, "This invite has already been used");
  if (invite.expiresAt < new Date()) throw new AppError(410, "Invite has expired");

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const dup = await tx.user.findFirst({
      where: { tenantId: invite.tenantId, email: invite.email },
    });
    if (dup) throw new AppError(409, "Email already registered in this workspace");

    const newUser = await tx.user.create({
      data: {
        tenantId: invite.tenantId,
        name: data.name,
        email: invite.email,
        passwordHash,
        role: invite.role as any,
      },
      select: { id: true, name: true, email: true, role: true, tenantId: true },
    });

    await tx.inviteToken.update({
      where: { id: invite.id },
      data: { isAccepted: true },
    });

    return newUser;
  });

  const tokenPayload = {
    userId: user.id,
    tenantId: invite.tenantId,
    role: user.role,
    email: user.email,
  };

  const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN as any,
  });
  const refreshToken = jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as any,
  });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken, user, tenant: invite.tenant };
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// createInviteService(tenantId, invitedById, data)
//   → cancels any prior pending invite for same email, creates InviteToken row,
//     calls sendInviteEmail stub, returns { id, email, role, expiresAt }
//
// validateInviteService(token)
//   → looks up InviteToken by token value, validates it isn't used/expired,
//     returns { email, role, tenantName, inviterName } for the accept-invite page
//
// acceptInviteService(token, data)
//   → validates invite, hashes password, creates User row inside a transaction,
//     marks InviteToken as accepted, issues access+refresh tokens, returns auth result
// ──────────────────────────────────────────────────────────────────────────────
