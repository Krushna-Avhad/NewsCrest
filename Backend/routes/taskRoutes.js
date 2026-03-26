import express from "express";
import { addTask, getTasks } from "../controllers/taskController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, addTask);
router.get("/", authMiddleware, getTasks);

export default router;