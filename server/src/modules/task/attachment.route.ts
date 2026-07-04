import { Router, raw } from "express";
import { requireRole } from "../../middleware/requireRole";
import { requireProjectWriter } from "../../middleware/requireProjectWriter";
import { ROLES } from "@taskflow/shared";
import {
  listAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
} from "./attachment.controller";

// mergeParams exposes :projectId and :taskId from the parent routers.
const router = Router({ mergeParams: true });

const canWrite = [
  requireRole(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER),
  requireProjectWriter,
];

// Note: requireProjectMember runs upstream in project.route.ts.
router.get("/", listAttachments);

// Uploads are raw binary: the file is the request body, filename in the
// X-Filename header (or ?filename=). Keeps us multipart-parser-free.
router.post("/", canWrite, raw({ type: "*/*", limit: "25mb" }), uploadAttachment);

router.get("/:attachmentId/download", downloadAttachment);
router.delete("/:attachmentId", canWrite, deleteAttachment);

export default router;
