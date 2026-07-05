import http from "http";
import app from "./app";
import { initSocket } from "./socket";
import { prisma } from "./config/prisma";
import { logger } from "./utils/logger";
import { envVars } from "./config/env";
import { withJobLock } from "./utils/jobLock";
import { initObservability, captureException } from "./utils/observability";
import { pruneRefreshTokens } from "./jobs/pruneRefreshTokens";
import { pruneAuthTokens } from "./jobs/pruneAuthTokens";
import { hardDeleteSoftDeleted } from "./jobs/hardDeleteSoftDeleted";
import { notifyDueSoon } from "./jobs/notifyDueSoon";
import { expireEndedSubscriptions } from "./modules/billing/billing.service";
import "dotenv/config";

const PORT = process.env.PORT || 5000;

initObservability();

const httpServer = http.createServer(app);

// Jobs interval handles (stored for cleanup on shutdown)
const jobIntervals: NodeJS.Timeout[] = [];

const HOUR = 60 * 60 * 1000;

/**
 * Register a maintenance job: runs shortly after boot and then on an interval.
 * Every run is guarded by a cluster-wide advisory lock so that with 2+ instances
 * the job executes once, not once per instance.
 */
const scheduleJob = (
  name: string,
  everyMs: number,
  fn: () => Promise<unknown>,
  startDelayMs = 30 * 1000
) => {
  const run = async () => {
    try {
      await withJobLock(name, async () => {
        await fn();
      });
    } catch (e) {
      captureException(e, { job: name });
    }
  };
  setTimeout(run, startDelayMs); // run once shortly after boot
  jobIntervals.push(setInterval(run, everyMs));
};

const startServer = async () => {
  // Local-disk attachments don't survive container restarts and break with
  // 2+ instances. Not a hard fail (single-instance compose mounts a volume
  // and is fine), but production operators must opt in knowingly.
  if (process.env.NODE_ENV === "production" && envVars.STORAGE_DRIVER === "local") {
    logger.warn(
      "STORAGE_DRIVER=local in production — attachments are stored on the container filesystem. " +
        "They are lost on restart unless a volume is mounted and will NOT work with multiple instances. Set STORAGE_DRIVER=s3."
    );
  }

  try {
    await prisma.$connect();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Database connection failed", { err: String(error) });
    process.exit(1);
  }

  await initSocket(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });

  // ── Scheduled maintenance jobs (distributed-lock guarded) ──
  scheduleJob("pruneRefreshTokens", 6 * HOUR, pruneRefreshTokens);
  scheduleJob("pruneAuthTokens", 6 * HOUR, pruneAuthTokens);
  scheduleJob("hardDeleteSoftDeleted", 24 * HOUR, hardDeleteSoftDeleted);
  scheduleJob("notifyDueSoon", 1 * HOUR, notifyDueSoon);
  scheduleJob("expireEndedSubscriptions", 6 * HOUR, expireEndedSubscriptions);
};

// Graceful shutdown — drain open connections before exiting
const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);

  jobIntervals.forEach(clearInterval);

  await new Promise<void>((resolve, reject) => {
    httpServer.close((err) => (err ? reject(err) : resolve()));
  });

  await prisma.$disconnect();
  logger.info("Server shut down cleanly");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) =>
  captureException(reason, { kind: "unhandledRejection" })
);

startServer();
