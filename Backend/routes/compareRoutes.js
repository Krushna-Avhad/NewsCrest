import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  compareArticles,
  compareArticlesById,
  getComparisonHistory,
  getComparison,
  deleteComparison
} from "../controllers/compareController.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Compare two news items
router.post("/", compareArticles);

// Compare two articles by ID
router.post("/articles/:articleId1/:articleId2", compareArticlesById);

// Get comparison history
router.get("/history", getComparisonHistory);

// Get single comparison
router.get("/:comparisonId", getComparison);

// Delete comparison
router.delete("/:comparisonId", deleteComparison);

export default router;