import express from "express";
import { checkAlerts } from "../controllers/alertController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, checkAlerts);

export default router;