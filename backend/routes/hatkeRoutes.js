import express from "express";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import {
  getHatkeNews,
  generateHatkeForArticle,
  getQuickSummaries,
  getSimplifiedVersion,
  generateAISummary,
  batchGenerateHatke,
  getFunnyNewsCategories,
  getTrendingHatke,
  getHatkeBySentiment,
  shareHatkeSummary
} from "../controllers/hatkeController.js";

const router = express.Router();

// Public routes
router.get("/", getHatkeNews);
router.get("/quick", getQuickSummaries);
router.get("/trending", getTrendingHatke);
router.get("/categories", getFunnyNewsCategories);
router.get("/sentiment/:sentiment", getHatkeBySentiment);

// Generate endpoints — use optionalAuth so logged-in users get tracked
// but logged-out users can still generate hatke summaries
router.post("/article/:articleId/hatke", optionalAuth, generateHatkeForArticle);
router.post("/article/:articleId/summary", optionalAuth, generateAISummary);
router.get("/article/:articleId/simple", optionalAuth, getSimplifiedVersion);
router.get("/article/:articleId/share", optionalAuth, shareHatkeSummary);

// Admin routes (add admin middleware later)
router.use(authenticateToken);
router.post("/batch-generate", batchGenerateHatke);

export default router;
