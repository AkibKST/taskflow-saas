import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";
import { ROLES } from "@taskflow/shared";
import { disconnectUser } from "../../socket";
import { assertSeatAvailable } from "../../utils/entitlements";
import { writeAudit, AUDIT } from "../../utils/audit";

// Active users in the caller's tenant — used to populate member pickers, etc.
export const listUsersService = async (tenantId: string) => {
  return prisma.user.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
};

const MANAGED_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  emailVerifiedAt: true,
  createdAt: true,
} as const;

// Every user in the tenant (incl. deactivated) for the admin management screen.
export const listManagedUsersService = async (tenantId: string) => {
  return prisma.user.findMany({
    where: { tenantId },
    select: MANAGED_SELECT,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
};

interface Actor {
  userId: string;
  tenantId: string;
  role: string;
}

// Load a target user scoped to the actor's tenant (prevents cross-tenant access).
const loadTarget = async (actor: Actor, targetId: string) => {
  const target = await prisma.user.findFirst({
    where: { id: targetId, tenantId: actor.tenantId },
    select: { id: true, role: true, isActive: true },
  });
  if (!target) throw new AppError(404, "User not found");
  return target;
};

// ADMINs may only manage non-privileged users; OWNERs may manage anyone.
const assertCanManageTarget = (actor: Actor, targetRole: string) => {
  if (actor.role === ROLES.OWNER) return;
  if (targetRole === ROLES.OWNER || targetRole === ROLES.ADMIN) {
    throw new AppError(403, "Admins cannot manage owners or other admins");
  }
};

// Ensure we never strip the workspace of its last active owner.
const assertNotLastOwner = async (tenantId: string, targetId: string) => {
  const owners = await prisma.user.count({
    where: { tenantId, role: ROLES.OWNER, isActive: true, NOT: { id: targetId } },
  });
  if (owners === 0) {
    throw new AppError(400, "Workspace must keep at least one active owner");
  }
};

export const updateUserRoleService = async (
  actor: Actor,
  targetId: string,
  newRole: string
) => {
  if (targetId === actor.userId) {
    throw new AppError(400, "You cannot change your own role");
  }

  const target = await loadTarget(actor, targetId);
  assertCanManageTarget(actor, target.role);

  // Admins cannot promote anyone to owner/admin.
  if (
    actor.role === ROLES.ADMIN &&
    (newRole === ROLES.OWNER || newRole === ROLES.ADMIN)
  ) {
    throw new AppError(403, "Admins cannot assign owner or admin roles");
  }

  // Demoting the last owner would lock everyone out of billing/ownership.
  if (target.role === ROLES.OWNER && newRole !== ROLES.OWNER) {
    await assertNotLastOwner(actor.tenantId, targetId);
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { role: newRole as never },
    select: MANAGED_SELECT,
  });

  // Sever live sockets so the new role is picked up on reconnect rather than
  // lagging until the JWT expires. (verifyToken re-reads the DB role per request.)
  if (target.role !== newRole) {
    disconnectUser(targetId, "role-changed");
    await writeAudit({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action: AUDIT.USER_ROLE_CHANGED,
      targetType: "user",
      targetId: targetId,
      metadata: { from: target.role, to: newRole },
    });
  }

  return updated;
};

export const setUserActiveService = async (
  actor: Actor,
  targetId: string,
  isActive: boolean
) => {
  if (targetId === actor.userId) {
    throw new AppError(400, "You cannot change your own status");
  }

  const target = await loadTarget(actor, targetId);
  assertCanManageTarget(actor, target.role);

  // Deactivating the last owner would orphan the workspace.
  if (!isActive && target.role === ROLES.OWNER) {
    await assertNotLastOwner(actor.tenantId, targetId);
  }

  // Reactivating consumes a seat — enforce the plan limit (skip if already active).
  if (isActive && !target.isActive) {
    await assertSeatAvailable(actor.tenantId, 1);
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data: { isActive },
    select: MANAGED_SELECT,
  });

  // Revoke sessions when deactivating so access ends immediately: kill refresh
  // tokens AND force-disconnect any live sockets. (verifyToken also rejects
  // inactive users, so any still-valid access token stops working at once.)
  if (!isActive) {
    await prisma.refreshToken.updateMany({
      where: { userId: targetId, isRevoked: false },
      data: { isRevoked: true },
    });
    disconnectUser(targetId, "deactivated");
  }

  await writeAudit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    action: isActive ? AUDIT.USER_REACTIVATED : AUDIT.USER_DEACTIVATED,
    targetType: "user",
    targetId: targetId,
  });

  return user;
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// listUsersService(tenantId)        → active users (member pickers)
// listManagedUsersService(tenantId) → all users incl. inactive (admin screen)
// updateUserRoleService(actor, id, role) → guarded role change (hierarchy + last-owner)
// setUserActiveService(actor, id, isActive) → activate/deactivate + revoke sessions
// ──────────────────────────────────────────────────────────────────────────────
