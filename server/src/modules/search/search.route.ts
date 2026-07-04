import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { search } from "./search.controller";

const router = Router();

// GET /api/v1/search?q=... — tenant-scoped, access-filtered search across
// projects and tasks the caller can see.
router.get("/", verifyToken, search);

export default router;
