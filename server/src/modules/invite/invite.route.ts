import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
import { requireVerifiedEmail } from "../../middleware/requireVerifiedEmail";
import { isTest } from "../../config/env";
import { ROLES } from "@taskflow/shared";
import {
  createInvite,
  validateInvite,
  acceptInvite,
  listInvites,
  revokeInvite,
  resendInvite,
} from "./invite.controller";

const router = Router();

const canInvite = requireRole(ROLES.OWNER, ROLES.ADMIN);

// Stricter limiter for the accept flow to prevent brute-force against token space
const inviteAcceptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts, try again in 15 minutes",
  skip: () => isTest,
});

// GET    /invite               — list pending invites (OWNER/ADMIN)
router.get("/", verifyToken, canInvite, listInvites);

// POST   /invite               — authenticated OWNER/ADMIN with a verified email
router.post("/", verifyToken, canInvite, requireVerifiedEmail, createInvite);

// POST   /invite/:id/resend    — re-send an existing pending invite
router.post("/:id/resend", verifyToken, canInvite, requireVerifiedEmail, resendInvite);

// DELETE /invite/:id           — revoke a pending invite
router.delete("/:id", verifyToken, canInvite, revokeInvite);

// GET    /invite/:token        — public (renders the accept-invite page data)
router.get("/:token", validateInvite);

// POST   /invite/:token/accept — public (creates the new account)
router.post("/:token/accept", inviteAcceptLimiter, acceptInvite);

export default router;

// ─── Function Summary ──────────────────────────────────────────────────────────
// GET    /              → protected; list pending invites for the tenant
// POST   /              → protected; OWNER/ADMIN (verified) sends an invite
// POST   /:id/resend    → protected; re-issue token + email for an invite
// DELETE /:id           → protected; revoke a pending invite
// GET    /:token        → public; validates invite token for the accept form
// POST   /:token/accept → public + rate-limited; creates the account
// ──────────────────────────────────────────────────────────────────────────────
