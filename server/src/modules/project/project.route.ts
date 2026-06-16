import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
import { requireProjectMember } from "../../middleware/requireProjectMember";
import { ROLES } from "@taskflow/shared";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} from "./project.controller";
import taskRoutes from "../task/task.route";

const router = Router();

router.use(verifyToken);

const canManage = requireRole(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER);

router.get("/", listProjects);
router.post("/", canManage, createProject);

// Project-scoped routes require membership (OWNER/ADMIN bypass inside middleware)
router.get("/:projectId", requireProjectMember, getProject);
router.patch("/:projectId", canManage, requireProjectMember, updateProject);
router.delete("/:projectId", canManage, requireProjectMember, deleteProject);
router.post("/:projectId/members", canManage, requireProjectMember, addMember);
router.delete("/:projectId/members/:userId", canManage, requireProjectMember, removeMember);

// Nested task routes: /projects/:projectId/tasks
router.use("/:projectId/tasks", requireProjectMember, taskRoutes);

export default router;

// ─── Function Summary ──────────────────────────────────────────────────────────
// All routes: verifyToken (JWT required)
// GET  /                  → list projects visible to the caller in their tenant
// POST /                  → canManage; create a new project
// GET  /:projectId        → requireProjectMember; get one project
// PATCH /:projectId       → canManage + requireProjectMember; update project
// DELETE /:projectId      → canManage + requireProjectMember; soft-delete project
// POST /:projectId/members      → canManage + requireProjectMember; add member
// DELETE /:projectId/members/:userId → canManage + requireProjectMember; remove member
// /:projectId/tasks       → requireProjectMember, then task sub-router
// ──────────────────────────────────────────────────────────────────────────────
