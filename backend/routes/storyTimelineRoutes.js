import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getMyStories,
  getStory,
  getArticleTimeline,
  getStoriesForSavedArticles,
  followAStory,
  unfollowAStory,
  processArticle,
  processBatch,
  getTrendingStories,
  generateFromInput,
  generateFromHistory,
  getUserHistory,
  getAllArticlesForDropdown,
  recordActivity,
} from "../controllers/storyTimelineController.js";

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.get("/trending",           getTrendingStories);
router.get("/story/:storyId",     getStory);
router.get("/article/:articleId", getArticleTimeline);

// ── Protected routes ─────────────────────────────────────────────────────────
router.use(protect);

router.get("/my-stories",             getMyStories);
router.get("/all-articles",           getAllArticlesForDropdown);
router.get("/history",                getUserHistory);
router.post("/follow/:storyId",       followAStory);
router.delete("/follow/:storyId",     unfollowAStory);
router.post("/generate",              generateFromInput);
router.post("/generate-from-history", generateFromHistory);
router.post("/for-saved-articles",    getStoriesForSavedArticles);
router.post("/record-activity",       recordActivity);

// Admin / maintenance
router.post("/process/:articleId",    processArticle);
router.post("/process-batch",         processBatch);

export default router;
