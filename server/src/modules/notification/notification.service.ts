import { prisma } from "../../config/prisma";
import {
  SOCKET_EVENTS,
  NOTIFICATION_TYPES,
  PAGINATION,
} from "@taskflow/shared";
import { emitToUser } from "../../socket";

interface CreateNotificationInput {
  userId: string;
  tenantId: string;
  type: string;
  message: string;
  linkUrl?: string;
}

// Each notification type maps to the per-user preference toggle that gates it.
// A missing preference row means "use the schema defaults" (all enabled).
const PREF_KEY_FOR_TYPE: Record<string, keyof PrefFlags> = {
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: "taskAssigned",
  [NOTIFICATION_TYPES.TASK_COMMENTED]: "commentMention",
  [NOTIFICATION_TYPES.MENTIONED]: "commentMention",
  [NOTIFICATION_TYPES.DUE_SOON]: "taskDue",
  [NOTIFICATION_TYPES.MEMBER_JOINED]: "memberJoined",
};

interface PrefFlags {
  taskAssigned: boolean;
  taskDue: boolean;
  commentMention: boolean;
  memberJoined: boolean;
  projectUpdate: boolean;
}

// Returns true when the user wants notifications of this type (defaults to true).
const isNotificationEnabled = async (
  userId: string,
  type: string
): Promise<boolean> => {
  const key = PREF_KEY_FOR_TYPE[type];
  if (!key) return true;
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: { [key]: true } as any,
  });
  if (!pref) return true; // no row yet → schema defaults (enabled)
  return (pref as any)[key] !== false;
};

export const createNotificationService = async (
  data: CreateNotificationInput
) => {
  // Respect the recipient's notification preferences — the settings page is no
  // longer decorative.
  const enabled = await isNotificationEnabled(data.userId, data.type);
  if (!enabled) return null;

  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      tenantId: data.tenantId,
      type: data.type as any,
      message: data.message,
      linkUrl: data.linkUrl,
    },
  });

  emitToUser(data.userId, SOCKET_EVENTS.NOTIFICATION_NEW, notification);
  return notification;
};

// Paginated notifications with an unread count for the badge.
export const listNotificationsService = async (
  userId: string,
  tenantId: string,
  opts: { page?: number; limit?: number } = {}
) => {
  const page = Math.max(1, opts.page ?? PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, opts.limit ?? PAGINATION.DEFAULT_LIMIT)
  );

  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where: { userId, tenantId } }),
    prisma.notification.count({ where: { userId, tenantId, isRead: false } }),
  ]);

  return {
    items,
    unread,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const markReadService = async (
  notificationId: string,
  userId: string
) => {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
};

export const markAllReadService = async (userId: string, tenantId: string) => {
  return prisma.notification.updateMany({
    where: { userId, tenantId, isRead: false },
    data: { isRead: true },
  });
};
