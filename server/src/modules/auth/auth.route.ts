import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, refresh, logout, getMe } from "./auth.controller";
import { verifyToken } from "../../middleware/verifyToken";

const router = Router();

// Auth-specific rate limiter — stricter
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many attempts, try again in 1 minute",
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getMe);

export default router;
