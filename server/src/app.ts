import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit, { Store } from "express-rate-limit";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { requestId } from "./middleware/requestId";
import { sendResponse } from "./utils/sendResponse";
import { logger } from "./utils/logger";
import { envVars, isProd, isTest } from "./config/env";
import httpStatus from "http-status-codes";
import { prisma } from "./config/prisma";
import authRoutes from "./modules/auth/auth.route";
import projectRoutes from "./modules/project/project.route";
import notificationRoutes from "./modules/notification/notification.route";
import userRoutes from "./modules/users/user.route";
import inviteRoutes from "./modules/invite/invite.route";
import settingsRoutes from "./modules/settings/settings.route";
import billingRoutes from "./modules/billing/billing.route";
import { stripeWebhookRouter } from "./modules/billing/billing.webhook";
import searchRoutes from "./modules/search/search.route";
import accountRoutes from "./modules/account/account.route";
import dashboardRoutes from "./modules/dashboard/dashboard.route";

const app = express();

// Behind a load balancer / reverse proxy, express must trust the proxy so that
// `req.ip` (used by the rate limiter) and `secure` protocol detection are based
// on X-Forwarded-* headers rather than the proxy's own address. Configurable so
// operators can set an exact hop count; defaults to a single hop in production.
if (envVars.TRUST_PROXY !== undefined) {
  const v = envVars.TRUST_PROXY;
  app.set("trust proxy", v === "true" ? true : v === "false" ? false : isNaN(Number(v)) ? v : Number(v));
} else if (isProd) {
  app.set("trust proxy", 1);
}

// Security headers + custom Content-Security-Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  })
);

app.use(
  cors({
    origin: envVars.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(requestId);

// Structured JSON request logging in production; human-readable in dev.
if (isProd) {
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) =>
          logger.info("http", { line: message.trim() }),
      },
    })
  );
} else {
  app.use(morgan("dev"));
}

// Stripe webhooks need the raw request body to verify the signature, so this
// router is mounted BEFORE express.json() and applies express.raw() itself.
app.use("/api/v1/billing/webhook", stripeWebhookRouter);

// The largest legitimate payload is a comment or task description; a 10mb limit
// was a needless DoS surface. Configurable via JSON_BODY_LIMIT (default 256kb).
app.use(express.json({ limit: envVars.JSON_BODY_LIMIT }));
app.use(cookieParser());

/**
 * Build a rate-limit store. In-memory by default (fine single-instance), but
 * backed by Redis when REDIS_URL is set so limits are shared across instances
 * and survive deploys. Uses lazy require so `rate-limit-redis`/`redis` remain
 * optional dependencies — falls back to memory if they aren't installed.
 */
const buildRateLimitStore = (): Store | undefined => {
  if (!envVars.REDIS_URL) return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RedisStore } = require("rate-limit-redis");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require("redis");
    const client = createClient({ url: envVars.REDIS_URL });
    client.connect().catch((e: unknown) =>
      logger.error("rate-limit redis connect failed", { err: String(e) })
    );
    logger.info("Rate-limit store: Redis (shared across instances)");
    return new RedisStore({
      sendCommand: (...args: string[]) => client.sendCommand(args),
    });
  } catch {
    logger.warn(
      "REDIS_URL set but rate-limit-redis/redis not installed — using in-memory rate limiter"
    );
    return undefined;
  }
};

const rateLimitStore = buildRateLimitStore();

// Global rate limiter (skipped under test — suites would trip it instantly)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: rateLimitStore,
    skip: () => isTest,
  })
);

// Welcome
app.get("/", (_req, res) => {
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Welcome to TaskFlow SaaS API",
    data: null,
  });
});

// Liveness — process is up
app.get("/health", (_req, res) =>
  res.json({ status: "OK", time: new Date() })
);

// Readiness — process is up AND the DB is reachable
app.get("/health/ready", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", db: "ok", time: new Date() });
  } catch (err) {
    next(err);
  }
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/invite", inviteRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/account", accountRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

// 404 handler
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

// Global error handler — must be last
app.use(globalErrorHandler);

export default app;
