import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { sendResponse } from "./utils/sendResponse";
import httpStatus from "http-status-codes";
import authRoutes from "./modules/auth/auth.route";

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Global rate limiter
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

// Test route
app.get("/", (req, res) => {
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Welcome to TaskFlow SaaS API",
    data: null,
  });
});

// Health check
app.get("/health", (_, res) => res.json({ status: "OK", time: new Date() }));

// Routes
app.use("/api/v1/auth", authRoutes);

// 404 handler
app.use((_, res) =>
  res.status(404).json({ success: false, message: "Route not found" }),
);

// Global error handler — MUST be last
app.use(globalErrorHandler);

export default app;
