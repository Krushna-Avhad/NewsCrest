// routes/perspectiveRoutes.js
import express from "express";
import { getPerspectives } from "../controllers/perspectiveController.js";

const router = express.Router();

// POST /api/perspective
// Public — no auth required (perspective generation is read-only)
router.post("/", getPerspectives);

export default router;
