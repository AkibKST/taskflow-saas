import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";
import { sendInviteEmail } from "../../utils/email";
import { assertSeatAvailable, getTenantEntitlements } from "../../utils/entitlements";
import { CreateInviteInput, AcceptInviteInput } from "./invite.model";

const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

const newInviteToken = () => crypto.randomBytes(32).toString("hex");

// Seat accounting counts active members plus still-pending invites so a tenant
// can't over-provision by sending more invites than it has open seats.
const assertInviteSeatAvailable = async (tenantId: string) => {
  const { seats, def } = await getTenantEntitlements(tenantId);
  const [activeUsers, pendingInvites] = await Promise.all([
    prisma.user.count({ where: { tenantId, isActive: true } }),
    prisma.inviteToken.count({
      where: { tenantId, isAccepted: false, expiresAt: { gt: new Date() } },
    }),
  ]);
  if (activeUsers + pendingInvites >= seats) {
    throw new AppError(
      403,
      `Your ${def.name} plan includes ${seats} seats and they are all used or ` +
        `reserved by pending invites. Upgrade your plan to invite more members.`
    );
  }
};

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

  // Global email identity: an email maps to exactly one TaskFlow account. Reject
  // early if it already exists anywhere, so login stays unambiguous. (Consistent
  // with registration, which also rejects globally.)
  const existing = await prisma.user.findFirst({ where: { email: data.email } });
  if (existing) {
    if (existing.tenantId === tenantId)
      throw new AppError(409, "User is already a member of this workspace");
    throw new AppError(409, "This email already has a TaskFlow account");
  }

  await assertInviteSeatAvailable(tenantId);

  // Cancel any previous pending invite for the same email in this tenant
  await prisma.inviteToken.updateMany({
    where: { tenantId, email: data.email, isAccepted: false },
    data: { isAccepted: true },
  });

  const token = newInviteToken();

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
  // Best-effort: the invite row is persisted; a delivery hiccup shouldn't fail
  // the request — the admin can use "resend" from the team page.
  await sendInviteEmail({
    to: data.email,
    inviterName: inviter?.name ?? "A teammate",
    tenantName: tenant.name,
    inviteUrl,
  }).catch((e) => console.error("[INVITE] sendInviteEmail failed:", e));

  return { id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt };
};

// List pending (unaccepted, unexpired) invites for the tenant's team page.
export const listInvitesService = async (tenantId: string) => {
  const invites = await prisma.inviteToken.findMany({
    where: { tenantId, isAccepted: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
      invitedBy: { select: { id: true, name: true } },
    },
  });
  return invites;
};

// Revoke a pending invite (marks it accepted so the token can no longer be used).
export const revokeInviteService = async (tenantId: string, inviteId: string) => {
  const invite = await prisma.inviteToken.findFirst({
    where: { id: inviteId, tenantId },
  });
  if (!invite) throw new AppError(404, "Invite not found");
  if (invite.isAccepted) throw new AppError(410, "Invite is already used or revoked");

  await prisma.inviteToken.update({
    where: { id: inviteId },
    data: { isAccepted: true },
  });
};

// Resend an invite: rotate the token, extend expiry, and email a fresh link.
export const resendInviteService = async (tenantId: string, inviteId: string) => {
  const invite = await prisma.inviteToken.findFirst({
    where: { id: inviteId, tenantId },
    include: {
      tenant: { select: { name: true } },
      invitedBy: { select: { name: true } },
    },
  });
  if (!invite) throw new AppError(404, "Invite not found");
  if (invite.isAccepted) throw new AppError(410, "Invite is already used or revoked");

  const token = newInviteToken();
  const updated = await prisma.inviteToken.update({
    where: { id: inviteId },
    data: { token, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
  });

  const inviteUrl = `${process.env.CLIENT_URL}/invite/${token}`;
  await sendInviteEmail({
    to: invite.email,
    inviterName: invite.invitedBy.name,
    tenantName: invite.tenant.name,
    inviteUrl,
  });

  return { id: updated.id, email: updated.email, role: updated.role, expiresAt: updated.expiresAt };
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
    // Global uniqueness: reject if the email now exists in ANY tenant (it may
    // have been registered elsewhere after the invite was sent).
    const dup = await tx.user.findFirst({ where: { email: invite.email } });
    if (dup) throw new AppError(409, "This email already has a TaskFlow account");

    // A seat must still be available at the moment of acceptance.
    await assertSeatAvailable(invite.tenantId, 1);

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
