import { Router } from "express";
import { requireRole } from "../../middleware/requireRole";
import { ROLES } from "@taskflow/shared";
import { listTasks, createTask, updateTask, deleteTask } from "./task.controller";

// mergeParams exposes :projectId from the parent project router
const router = Router({ mergeParams: true });

const canWrite = requireRole(
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.MEMBER
);

router.get("/", listTasks);
router.post("/", canWrite, createTask);
router.patch("/:taskId", canWrite, updateTask);
router.delete("/:taskId", canWrite, deleteTask);

export default router;
