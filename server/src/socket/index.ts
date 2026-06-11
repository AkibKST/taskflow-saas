import { Server, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { envVars } from "../config/env";
import { SOCKET_EVENTS } from "@taskflow/shared";

let io: Server | null = null;

// presence: projectId → Set of userIds currently viewing the project
const presence = new Map<string, Set<string>>();

export const initSocket = (httpServer: http.Server): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: envVars.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // JWT handshake auth
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) return next(new Error("Authentication required"));

    try {
      const payload = jwt.verify(token, envVars.JWT_SECRET) as {
        userId: string;
        tenantId: string;
      };
      (socket as any).userId = payload.userId;
      (socket as any).tenantId = payload.tenantId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId as string;

    // Each user gets a private room for direct notifications
    socket.join(`user:${userId}`);

    socket.on(SOCKET_EVENTS.PROJECT_JOIN, (projectId: string) => {
      socket.join(`project:${projectId}`);

      if (!presence.has(projectId)) presence.set(projectId, new Set());
      presence.get(projectId)!.add(userId);

      io!.to(`project:${projectId}`).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
        projectId,
        onlineUserIds: [...presence.get(projectId)!],
      });
    });

    socket.on(SOCKET_EVENTS.PROJECT_LEAVE, (projectId: string) => {
      socket.leave(`project:${projectId}`);

      presence.get(projectId)?.delete(userId);

      io!.to(`project:${projectId}`).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
        projectId,
        onlineUserIds: [...(presence.get(projectId) ?? [])],
      });
    });

    socket.on("disconnect", () => {
      presence.forEach((users, projectId) => {
        if (users.delete(userId)) {
          io!.to(`project:${projectId}`).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
            projectId,
            onlineUserIds: [...users],
          });
        }
      });
    });
  });

  return io;
};

export const emitToProject = (
  projectId: string,
  event: string,
  payload: unknown
) => io?.to(`project:${projectId}`).emit(event, payload);

export const emitToUser = (
  userId: string,
  event: string,
  payload: unknown
) => io?.to(`user:${userId}`).emit(event, payload);
