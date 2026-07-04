import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { requireProjectWriter } from "../../middleware/requireProjectWriter";
import { ROLES } from "@taskflow/shared";
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
} from "./comment.controller";

// mergeParams gives access to :taskId from the parent task/project router
const router = Router({ mergeParams: true });

// Commenting requires a writable org role AND a non-VIEWER project role.
const canWrite = [
  requireRole(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER),
  requireProjectWriter,
];

// Note: requireProjectMember is applied upstream in project.route.ts
router.get("/", listComments);
router.post("/", canWrite, createComment);
router.patch("/:commentId", canWrite, updateComment);
router.delete("/:commentId", canWrite, deleteComment);

export default router;

// ─── Function Summary ──────────────────────────────────────────────────────────
// GET    /                → listComments; any project member
// POST   /                → createComment; canWrite members
// PATCH  /:commentId      → updateComment; canWrite (ownership enforced in service)
// DELETE /:commentId      → deleteComment; canWrite (ownership enforced in service)
// ──────────────────────────────────────────────────────────────────────────────
