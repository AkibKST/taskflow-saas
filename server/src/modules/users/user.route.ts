import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { listUsers } from "./user.controller";

const router = Router();

router.use(verifyToken);

router.get("/", listUsers);

export default router;
