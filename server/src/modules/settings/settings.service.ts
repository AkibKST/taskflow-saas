import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";
import {
  UpdateNotificationPrefsInput,
  UpdateWorkspaceInput,
} from "./settings.model";

const PREF_SELECT = {
  taskAssigned: true,
  taskDue: true,
  commentMention: true,
  memberJoined: true,
  projectUpdate: true,
  updatedAt: true,
} as const;

// Read the caller's notification preferences, lazily creating the row with
// defaults (all enabled) the first time it's requested.
export const getNotificationPrefsService = async (userId: string) => {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: PREF_SELECT,
  });
};

export const updateNotificationPrefsService = async (
  userId: string,
  data: UpdateNotificationPrefsInput
) => {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: PREF_SELECT,
  });
};

// Workspace (tenant) settings — readable by any member, writable by OWNER/ADMIN.
export const getWorkspaceService = async (tenantId: string) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, logoUrl: true },
  });
  if (!tenant) throw new AppError(404, "Workspace not found");
  return tenant;
};

export const updateWorkspaceService = async (
  tenantId: string,
  data: UpdateWorkspaceInput
) => {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      // Empty string clears the logo.
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
    },
    select: { id: true, name: true, slug: true, logoUrl: true },
  });
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// getNotificationPrefsService(userId)        → upserts + returns the user's toggles
// updateNotificationPrefsService(userId, d)  → upserts the provided toggle changes
// getWorkspaceService(tenantId)              → returns { id, name, slug, logoUrl }
// updateWorkspaceService(tenantId, data)     → updates workspace name / logo URL
// ──────────────────────────────────────────────────────────────────────────────
