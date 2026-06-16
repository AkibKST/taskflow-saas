import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, refresh, logout, getMe } from "./auth.controller";
import { verifyToken } from "../../middleware/verifyToken";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many attempts, try again in 1 minute",
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh); // rate-limited — protects token endpoint
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getMe);

export default router;

// ─── Function Summary ──────────────────────────────────────────────────────────
// authLimiter → 5 req/min rate limiter applied to all auth mutation routes
// POST /register → rate-limited; create org + owner
// POST /login    → rate-limited; sign in
// POST /refresh  → rate-limited; rotate refresh token pair
// POST /logout   → authenticated; revoke token
// GET  /me       → authenticated; return current user
// ──────────────────────────────────────────────────────────────────────────────
