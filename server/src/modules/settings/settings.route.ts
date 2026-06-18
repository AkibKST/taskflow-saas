import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
import { ROLES } from "@taskflow/shared";
import {
  getNotificationPrefs,
  updateNotificationPrefs,
  getWorkspace,
  updateWorkspace,
} from "./settings.controller";

const router = Router();

router.use(verifyToken);

const canManageWorkspace = requireRole(ROLES.OWNER, ROLES.ADMIN);

// Per-user notification preferences
router.get("/notifications", getNotificationPrefs);
router.patch("/notifications", updateNotificationPrefs);

// Workspace (tenant) settings — read for any member, write for OWNER/ADMIN
router.get("/workspace", getWorkspace);
router.patch("/workspace", canManageWorkspace, updateWorkspace);

export default router;

// ─── Function Summary ──────────────────────────────────────────────────────────
// GET   /settings/notifications → authenticated; the caller's toggles
// PATCH /settings/notifications → authenticated; save toggle changes
// GET   /settings/workspace     → authenticated; workspace name / logo
// PATCH /settings/workspace     → OWNER/ADMIN; update workspace name / logo
// ──────────────────────────────────────────────────────────────────────────────
