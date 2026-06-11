import { prisma } from "../../config/prisma";
import { SOCKET_EVENTS } from "@taskflow/shared";
import { emitToUser } from "../../socket";

interface CreateNotificationInput {
  userId: string;
  tenantId: string;
  type: string;
  message: string;
  linkUrl?: string;
}

export const createNotificationService = async (
  data: CreateNotificationInput
) => {
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

export const listNotificationsService = async (
  userId: string,
  tenantId: string
) => {
  return prisma.notification.findMany({
    where: { userId, tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
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
