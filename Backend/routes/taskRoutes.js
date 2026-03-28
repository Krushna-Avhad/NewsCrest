import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  createTask,
  createNoteFromArticle,
  getTasks,
  getTask,
  updateTask,
  toggleTaskCompletion,
  togglePinStatus,
  deleteTask,
  getTasksByType,
  getUpcomingDeadlines,
  getTaskStatistics
} from "../controllers/taskController.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create task/note
router.post("/", createTask);

// Create note from article
router.post("/article/:articleId/note", createNoteFromArticle);

// Get all tasks/notes
router.get("/", getTasks);

// Get single task
router.get("/:taskId", getTask);

// Update task
router.put("/:taskId", updateTask);

// Toggle completion status
router.put("/:taskId/toggle", toggleTaskCompletion);

// Toggle pin status
router.put("/:taskId/pin", togglePinStatus);

// Delete task
router.delete("/:taskId", deleteTask);

// Get tasks by type
router.get("/type/:type", getTasksByType);

// Get upcoming deadlines
router.get("/deadlines", getUpcomingDeadlines);

// Get task statistics
router.get("/statistics", getTaskStatistics);

export default router;