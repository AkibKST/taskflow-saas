import { prisma } from "../config/prisma";
import { logger } from "./logger";

export interface AuditEntry {
  tenantId: string;
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

/**
 * Append a security-relevant event to the audit trail. Best-effort: auditing
 * must never break the action it records, so failures are logged, not thrown.
 * Wire this into role changes, deactivations, plan changes, deletions, etc.
 */
export const writeAudit = async (entry: AuditEntry): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata as any,
        ip: entry.ip,
      },
    });
  } catch (err) {
    logger.error("audit write failed", { action: entry.action, err: String(err) });
  }
};

/** Canonical audit action names (keep grep-able and stable). */
export const AUDIT = {
  USER_ROLE_CHANGED: "user.role_changed",
  USER_DEACTIVATED: "user.deactivated",
  USER_REACTIVATED: "user.reactivated",
  BILLING_PLAN_CHANGED: "billing.plan_changed",
  BILLING_CANCELED: "billing.canceled",
  PROJECT_DELETED: "project.deleted",
  INVITE_CREATED: "invite.created",
  INVITE_REVOKED: "invite.revoked",
  TENANT_EXPORTED: "tenant.exported",
  ACCOUNT_DELETED: "account.deleted",
} as const;
