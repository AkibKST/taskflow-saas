import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { requireProjectWriter } from "../../middleware/requireProjectWriter";
import { ROLES } from "@taskflow/shared";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getActivity,
  listSubtasks,
} from "./task.controller";
import commentRoutes from "../comment/comment.route";
import attachmentRoutes from "./attachment.route";

// mergeParams exposes :projectId from the parent project router
const router = Router({ mergeParams: true });

// Writing a task requires BOTH an org role that can write AND a project role
// that isn't VIEWER (requireProjectWriter reads req.projectRole set upstream).
const canWrite = [
  requireRole(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER),
  requireProjectWriter,
];

// Note: requireProjectMember is applied in project.route.ts before this sub-router
router.get("/", listTasks);
router.post("/", canWrite, createTask);

// Batch reorder must be declared before /:taskId so "reorder" isn't treated as a taskId
router.patch("/reorder", canWrite, reorderTasks);

router.patch("/:taskId", canWrite, updateTask);
router.delete("/:taskId", canWrite, deleteTask);

// Sub-tasks of a task (read-only list; create via POST / with parentTaskId)
router.get("/:taskId/subtasks", listSubtasks);

// Task activity feed (read-only): /projects/:projectId/tasks/:taskId/activity
router.get("/:taskId/activity", getActivity);

// Nested comments: /projects/:projectId/tasks/:taskId/comments
router.use("/:taskId/comments", commentRoutes);

// Nested attachments: /projects/:projectId/tasks/:taskId/attachments
router.use("/:taskId/attachments", attachmentRoutes);

export default router;

// ─── Function Summary ──────────────────────────────────────────────────────────
// GET    /                → listTasks; read any project member
// POST   /                → createTask; canWrite members
// PATCH  /reorder         → reorderTasks; batch update order+status in one request
// PATCH  /:taskId         → updateTask; canWrite members
// DELETE /:taskId         → deleteTask; canWrite members
// ──────────────────────────────────────────────────────────────────────────────
