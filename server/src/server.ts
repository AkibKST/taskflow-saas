import http from "http";
import app from "./app";
import { initSocket } from "./socket";
import { prisma } from "./config/prisma";
import { pruneRefreshTokens } from "./jobs/pruneRefreshTokens";
import { hardDeleteSoftDeleted } from "./jobs/hardDeleteSoftDeleted";
import "dotenv/config";

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

// Jobs interval handles (stored for cleanup on shutdown)
const jobIntervals: NodeJS.Timeout[] = [];

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }

  await initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running → http://localhost:${PORT}`);
    console.log(`🏥 Liveness  → http://localhost:${PORT}/health`);
    console.log(`🏥 Readiness → http://localhost:${PORT}/health/ready`);
  });

  // Scheduled maintenance jobs
  // Prune expired/revoked refresh tokens every 6 hours
  jobIntervals.push(
    setInterval(async () => {
      try { await pruneRefreshTokens(); }
      catch (e) { console.error("[JOBS] pruneRefreshTokens failed:", e); }
    }, 6 * 60 * 60 * 1000)
  );

  // Hard-delete soft-deleted records older than 30 days, once per day
  jobIntervals.push(
    setInterval(async () => {
      try { await hardDeleteSoftDeleted(); }
      catch (e) { console.error("[JOBS] hardDeleteSoftDeleted failed:", e); }
    }, 24 * 60 * 60 * 1000)
  );
};

// Graceful shutdown — drain open connections before exiting
const shutdown = async (signal: string) => {
  console.log(`\n⚙️  ${signal} received — shutting down gracefully…`);

  jobIntervals.forEach(clearInterval);

  await new Promise<void>((resolve, reject) => {
    httpServer.close((err) => (err ? reject(err) : resolve()));
  });

  await prisma.$disconnect();
  console.log("👋 Server shut down cleanly");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();

// ─── Function Summary ──────────────────────────────────────────────────────────
// startServer()  → connects DB, inits Socket.IO, starts HTTP server, registers cron jobs
// shutdown(signal) → clears job intervals, closes HTTP server, disconnects Prisma, exits 0
//
// Scheduled jobs (registered in startServer):
//   pruneRefreshTokens   — every 6 hours: deletes expired/revoked tokens
//   hardDeleteSoftDeleted — every 24 hours: hard-deletes records past 30-day retention
// ──────────────────────────────────────────────────────────────────────────────
