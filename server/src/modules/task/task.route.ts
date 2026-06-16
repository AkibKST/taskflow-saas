import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { ROLES } from "@taskflow/shared";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
} from "./task.controller";
import commentRoutes from "../comment/comment.route";

// mergeParams exposes :projectId from the parent project router
const router = Router({ mergeParams: true });

const canWrite = requireRole(
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.MEMBER
);

// Note: requireProjectMember is applied in project.route.ts before this sub-router
router.get("/", listTasks);
router.post("/", canWrite, createTask);

// Batch reorder must be declared before /:taskId so "reorder" isn't treated as a taskId
router.patch("/reorder", canWrite, reorderTasks);

router.patch("/:taskId", canWrite, updateTask);
router.delete("/:taskId", canWrite, deleteTask);

// Nested comments: /projects/:projectId/tasks/:taskId/comments
router.use("/:taskId/comments", commentRoutes);

export default router;

// ─── Function Summary ──────────────────────────────────────────────────────────
// GET    /                → listTasks; read any project member
// POST   /                → createTask; canWrite members
// PATCH  /reorder         → reorderTasks; batch update order+status in one request
// PATCH  /:taskId         → updateTask; canWrite members
// DELETE /:taskId         → deleteTask; canWrite members
// ──────────────────────────────────────────────────────────────────────────────
