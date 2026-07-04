import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { ROLES } from "@taskflow/shared";

/**
 * Assemble a full export of a tenant's data (GDPR / DPA "right to access").
 * Owner-only. Passwords and token secrets are never included.
 */
export const exportTenantDataService = async (tenantId: string) => {
  const [tenant, users, projects, tasks, comments, invoices, invites, auditLogs] =
    await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.user.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      }),
      prisma.project.findMany({ where: { tenantId } }),
      prisma.task.findMany({ where: { tenantId } }),
      prisma.comment.findMany({ where: { task: { tenantId } } }),
      prisma.invoice.findMany({ where: { subscription: { tenantId } } }),
      prisma.inviteToken.findMany({
        where: { tenantId },
        select: { id: true, email: true, role: true, isAccepted: true, createdAt: true },
      }),
      prisma.auditLog.findMany({ where: { tenantId } }),
    ]);

  if (!tenant) throw new AppError(404, "Workspace not found");

  return {
    exportedAt: new Date().toISOString(),
    tenant,
    users,
    projects,
    tasks,
    comments,
    invoices,
    invites,
    auditLogs,
  };
};

/**
 * Permanently delete a workspace and everything under it (cascades to users,
 * projects, tasks, comments, invoices, etc.). Owner-only; requires the caller
 * to re-type the workspace slug as confirmation.
 */
export const deleteTenantService = async (
  tenantId: string,
  actorId: string,
  confirmation: string
) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new AppError(404, "Workspace not found");
  if (confirmation !== tenant.slug) {
    throw new AppError(400, "Confirmation does not match the workspace identifier");
  }

  logger.warn("tenant deletion", { tenantId, actorId, slug: tenant.slug });
  // FK cascades remove all child rows. (Attachment blobs in object storage are
  // orphaned — a storage lifecycle rule / sweep job should reclaim them.)
  await prisma.tenant.delete({ where: { id: tenantId } });
};

/**
 * Delete the caller's own account (right to erasure). Requires the current
 * password. Refuses if the caller is the workspace's last active owner — they
 * must transfer ownership or delete the whole workspace instead.
 */
export const deleteOwnAccountService = async (
  userId: string,
  tenantId: string,
  password: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError(400, "Password is incorrect");

  if (user.role === ROLES.OWNER) {
    const otherOwners = await prisma.user.count({
      where: { tenantId, role: ROLES.OWNER, isActive: true, NOT: { id: userId } },
    });
    if (otherOwners === 0) {
      throw new AppError(
        400,
        "You are the last owner. Transfer ownership or delete the workspace instead."
      );
    }
  }

  await prisma.user.delete({ where: { id: userId } });
};
