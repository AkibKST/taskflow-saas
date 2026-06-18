import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
import { ROLES } from "@taskflow/shared";
import { getBilling, changePlan, cancelSubscription } from "./billing.controller";

const router = Router();

router.use(verifyToken);

// Billing is owner-only (matches the /admin/billing page gate).
const ownerOnly = requireRole(ROLES.OWNER);

router.get("/", ownerOnly, getBilling);
router.post("/change-plan", ownerOnly, changePlan);
router.post("/cancel", ownerOnly, cancelSubscription);

export default router;

// ─── Function Summary ──────────────────────────────────────────────────────────
// GET  /billing             → OWNER; subscription + plan catalog + invoices
// POST /billing/change-plan → OWNER; switch plan (via provider) + invoice
// POST /billing/cancel      → OWNER; schedule cancellation at period end
// ──────────────────────────────────────────────────────────────────────────────
