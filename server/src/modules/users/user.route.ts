import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
import { ROLES } from "@taskflow/shared";
import {
  listUsers,
  listManagedUsers,
  updateUserRole,
  setUserStatus,
} from "./user.controller";

const router = Router();

router.use(verifyToken);

const canManageUsers = requireRole(ROLES.OWNER, ROLES.ADMIN);

// Active users — any authenticated member (member pickers, assignee lists)
router.get("/", listUsers);

// Admin user management
router.get("/manage", canManageUsers, listManagedUsers);
router.patch("/:userId/role", canManageUsers, updateUserRole);
router.patch("/:userId/status", canManageUsers, setUserStatus);

export default router;

// ─── Function Summary ──────────────────────────────────────────────────────────
// GET   /users                → authenticated; active users in tenant
// GET   /users/manage         → OWNER/ADMIN; all users incl. deactivated
// PATCH /users/:userId/role   → OWNER/ADMIN; change a user's org role
// PATCH /users/:userId/status → OWNER/ADMIN; activate / deactivate a user
// ──────────────────────────────────────────────────────────────────────────────
