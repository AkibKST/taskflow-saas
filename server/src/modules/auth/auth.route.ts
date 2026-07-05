import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "./auth.controller";
import { verifyToken } from "../../middleware/verifyToken";
import { isTest } from "../../config/env";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many attempts, try again in 1 minute",
  skip: () => isTest,
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh); // rate-limited — protects token endpoint
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/verify-email", authLimiter, verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getMe);
router.patch("/me", verifyToken, updateMe);
router.patch("/me/password", verifyToken, changePassword);

export default router;

// ─── Function Summary ──────────────────────────────────────────────────────────
// authLimiter → 5 req/min rate limiter applied to all auth mutation routes
// POST /register → rate-limited; create org + owner
// POST /login    → rate-limited; sign in
// POST /refresh  → rate-limited; rotate refresh token pair
// POST /logout   → authenticated; revoke token
// GET  /me       → authenticated; return current user
// PATCH /me      → authenticated; update own name / email
// PATCH /me/password → authenticated; change own password
// ──────────────────────────────────────────────────────────────────────────────
