import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { getSummary } from "./dashboard.controller";

const router = Router();

router.use(verifyToken);

router.get("/summary", getSummary);

export default router;
