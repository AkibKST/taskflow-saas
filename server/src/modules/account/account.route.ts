import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
import { ROLES } from "@taskflow/shared";
import {
  exportTenantData,
  deleteWorkspace,
  deleteOwnAccount,
} from "./account.controller";

const router = Router();

router.use(verifyToken);

const ownerOnly = requireRole(ROLES.OWNER);

// GET    /account/export     — OWNER; full workspace data export (GDPR access)
router.get("/export", ownerOnly, exportTenantData);

// DELETE /account/workspace  — OWNER; permanently delete the whole workspace
router.delete("/workspace", ownerOnly, deleteWorkspace);

// DELETE /account/me         — any user; delete own account (right to erasure)
router.delete("/me", deleteOwnAccount);

export default router;
