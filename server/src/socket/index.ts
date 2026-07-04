import { Server, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { envVars } from "../config/env";
import { SOCKET_EVENTS } from "@taskflow/shared";
import { checkProjectAccess } from "../utils/projectAccess";
import { logger } from "../utils/logger";
import { initPresence, getPresence } from "./presence";

let io: Server | null = null;

export const initSocket = async (httpServer: http.Server): Promise<Server> => {
  // Reference-counted presence, Redis-backed when REDIS_URL is set.
  await initPresence();


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
      // Dynamic import so the server starts fine without the package installed.
      // Indirect specifiers keep these as truly optional deps — TypeScript won't
      // try to resolve them at build time when they aren't present.
      const redisAdapterPkg: string = "@socket.io/redis-adapter";
      const redisPkg: string = "redis";
      const { createAdapter } = await import(redisAdapterPkg);
      const { createClient } = await import(redisPkg);
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
        role: string;
      };
      (socket as any).userId = payload.userId;
      (socket as any).tenantId = payload.tenantId;
      (socket as any).role = payload.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const tenantId = (socket as any).tenantId as string;
    const role = (socket as any).role as string;

    logger.debug("socket connected", { socketId: socket.id, userId });

    // Track which projects THIS socket joined so presence can be released on
    // disconnect (socket.rooms is already cleared by the time 'disconnect' fires).
    const joinedProjects = new Set<string>();

    // Private notification room
    socket.join(`user:${userId}`);

    // Joining a project room grants live task/comment/presence events for that
    // project — so it must enforce the SAME tenant + membership rules as the
    // REST layer. Without this, any authenticated user could join any project's
    // room (including other tenants') and receive its live data.
    socket.on(
      SOCKET_EVENTS.PROJECT_JOIN,
      async (projectId: string, ack?: (res: { ok: boolean }) => void) => {
        try {
          if (typeof projectId !== "string" || !projectId) {
            return ack?.({ ok: false });
          }
          const access = await checkProjectAccess(userId, tenantId, role, projectId);
          if (!access.ok) {
            logger.warn("socket PROJECT_JOIN denied", { userId, tenantId, projectId });
            return ack?.({ ok: false });
          }

          socket.join(`project:${projectId}`);
          joinedProjects.add(projectId);
          const online = await getPresence().join(projectId, userId);
          io!.to(`project:${projectId}`).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
            projectId,
            onlineUserIds: online,
          });
          ack?.({ ok: true });
        } catch (err) {
          logger.error("socket PROJECT_JOIN error", { err: String(err) });
          ack?.({ ok: false });
        }
      }
    );

    socket.on(SOCKET_EVENTS.PROJECT_LEAVE, async (projectId: string) => {
      socket.leave(`project:${projectId}`);
      joinedProjects.delete(projectId);
      const online = await getPresence().leave(projectId, userId);
      io!.to(`project:${projectId}`).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
        projectId,
        onlineUserIds: online,
      });
    });

    socket.on("disconnect", async () => {
      logger.debug("socket disconnected", { socketId: socket.id, userId });
      // Drop presence for exactly the projects THIS socket joined (other
      // tabs/instances keep their own ref counts).
      for (const projectId of joinedProjects) {
        const online = await getPresence().leave(projectId, userId);
        io!.to(`project:${projectId}`).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
          projectId,
          onlineUserIds: online,
        });
      }
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

/**
 * Immediately sever a user's realtime access. Emits SESSION_REVOKED (so the
 * client can log itself out) and force-disconnects every open socket in the
 * user's room. Called when a user is deactivated or has their role changed so
 * already-connected sockets don't retain access until their JWT expires.
 */
export const disconnectUser = (userId: string, reason = "revoked") => {
  if (!io) return;
  io.to(`user:${userId}`).emit(SOCKET_EVENTS.SESSION_REVOKED, { reason });
  io.in(`user:${userId}`).disconnectSockets(true);
};

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
