import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
import { ROLES } from "@taskflow/shared";
import { createInvite, validateInvite, acceptInvite } from "./invite.controller";

const router = Router();

const canInvite = requireRole(ROLES.OWNER, ROLES.ADMIN);

// Stricter limiter for the accept flow to prevent brute-force against token space
const inviteAcceptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts, try again in 15 minutes",
});

// POST   /invite               — authenticated OWNER/ADMIN only
router.post("/", verifyToken, canInvite, createInvite);

// GET    /invite/:token        — public (renders the accept-invite page data)
router.get("/:token", validateInvite);

// POST   /invite/:token/accept — public (creates the new account)
router.post("/:token/accept", inviteAcceptLimiter, acceptInvite);

export default router;

// ─── Function Summary ──────────────────────────────────────────────────────────
// POST /               → protected; OWNER or ADMIN sends an invite email
// GET  /:token         → public; validates invite token before rendering accept form
// POST /:token/accept  → public + rate-limited; creates user account on acceptance
// ──────────────────────────────────────────────────────────────────────────────
