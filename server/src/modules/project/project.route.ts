import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
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
router.get("/:projectId", getProject);
router.patch("/:projectId", canManage, updateProject);
router.delete("/:projectId", canManage, deleteProject);
router.post("/:projectId/members", canManage, addMember);
router.delete("/:projectId/members/:userId", canManage, removeMember);

// Nested task routes: /projects/:projectId/tasks
router.use("/:projectId/tasks", taskRoutes);

export default router;
