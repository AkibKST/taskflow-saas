import { Server, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { envVars } from "../config/env";
import { SOCKET_EVENTS } from "@taskflow/shared";

let io: Server | null = null;

// In-memory presence fallback (replaced by Redis when REDIS_URL is set)
const localPresence = new Map<string, Set<string>>();

// Helpers that work whether presence is in-memory or delegated to Redis adapter
const presenceAdd = (projectId: string, userId: string) => {
  if (!localPresence.has(projectId)) localPresence.set(projectId, new Set());
  localPresence.get(projectId)!.add(userId);
};
const presenceRemove = (projectId: string, userId: string) => {
  localPresence.get(projectId)?.delete(userId);
};
const presenceList = (projectId: string): string[] => [
  ...(localPresence.get(projectId) ?? []),
];

export const initSocket = async (httpServer: http.Server): Promise<Server> => {
  io = new Server(httpServer, {
    cors: {
      origin: envVars.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Attach Redis adapter when REDIS_URL is configured — enables horizontal scaling
  if (process.env.REDIS_URL) {
    try {
      // Dynamic import so the server starts fine without the package installed
      const { createAdapter } = await import("@socket.io/redis-adapter");
      const { createClient } = await import("redis");
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient as any, subClient as any));
      console.log("🔴 Socket.IO Redis adapter enabled (horizontal scaling ready)");
    } catch (err) {
      console.warn(
        "⚠️  REDIS_URL set but @socket.io/redis-adapter or redis not installed — falling back to in-memory.\n" +
        "   Run: npm install @socket.io/redis-adapter redis  (in server/)"
      );
    }
  }

  console.log("🔌 Socket.IO initialized");

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

    console.log(`⚡ Socket connected → ${socket.id} (user: ${userId})`);

    // Private notification room
    socket.join(`user:${userId}`);

    socket.on(SOCKET_EVENTS.PROJECT_JOIN, (projectId: string) => {
      socket.join(`project:${projectId}`);
      presenceAdd(projectId, userId);
      io!.to(`project:${projectId}`).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
        projectId,
        onlineUserIds: presenceList(projectId),
      });
    });

    socket.on(SOCKET_EVENTS.PROJECT_LEAVE, (projectId: string) => {
      socket.leave(`project:${projectId}`);
      presenceRemove(projectId, userId);
      io!.to(`project:${projectId}`).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
        projectId,
        onlineUserIds: presenceList(projectId),
      });
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected → ${socket.id} (user: ${userId})`);
      localPresence.forEach((users, projectId) => {
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

// ─── Function Summary ──────────────────────────────────────────────────────────
// initSocket(httpServer)
//   → initialises Socket.IO, optionally attaches Redis adapter (when REDIS_URL set),
//     wires JWT handshake auth, presence JOIN/LEAVE/disconnect handlers.
//     Call once at server startup and await the result.
//
// presenceAdd(projectId, userId)    → add userId to in-memory presence map for projectId
// presenceRemove(projectId, userId) → remove userId from in-memory presence map
// presenceList(projectId)           → returns array of online userIds for projectId
//
// emitToProject(projectId, event, payload) → broadcast event to project:<id> room
// emitToUser(userId, event, payload)       → send event to private user:<id> room
// ──────────────────────────────────────────────────────────────────────────────
