import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import {
  listNotifications,
  markRead,
  markAllRead,
} from "./notification.controller";

const router = Router();

router.use(verifyToken);

router.get("/", listNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:notificationId/read", markRead);

export default router;
