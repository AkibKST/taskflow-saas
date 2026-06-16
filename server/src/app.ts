import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { sendResponse } from "./utils/sendResponse";
import httpStatus from "http-status-codes";
import { prisma } from "./config/prisma";
import authRoutes from "./modules/auth/auth.route";
import projectRoutes from "./modules/project/project.route";
import notificationRoutes from "./modules/notification/notification.route";
import userRoutes from "./modules/users/user.route";
import inviteRoutes from "./modules/invite/invite.route";

const app = express();

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
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

// Structured JSON request logging in production; human-readable in dev
if (process.env.NODE_ENV === "production") {
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) =>
          process.stdout.write(
            JSON.stringify({
              level: "info",
              type: "http",
              message: message.trim(),
              time: new Date().toISOString(),
            }) + "\n"
          ),
      },
    })
  );
} else {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Global rate limiter
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

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

// 404 handler
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

// Global error handler — must be last
app.use(globalErrorHandler);

export default app;

// ─── Function Summary ──────────────────────────────────────────────────────────
// app (Express instance)
//   → mounts all middleware in order: helmet (CSP) → cors → morgan → json → cookie
//     → rate-limit → routes → 404 → globalErrorHandler
//
// GET  /                → welcome message
// GET  /health          → liveness check (process is running)
// GET  /health/ready    → readiness check (process + DB connection verified)
//
// Mounted routers:
//   /api/v1/auth                          → authRoutes
//   /api/v1/invite                        → inviteRoutes
//   /api/v1/projects                      → projectRoutes
//     /:projectId/tasks                   → taskRoutes (nested)
//       /:taskId/comments                 → commentRoutes (nested inside tasks)
//   /api/v1/notifications                 → notificationRoutes
//   /api/v1/users                         → userRoutes
// ──────────────────────────────────────────────────────────────────────────────
