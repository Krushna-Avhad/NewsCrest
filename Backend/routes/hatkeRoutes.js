import express from "express";
import { authenticateToken } from "../middleware/auth.js";
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

// Authenticated routes
router.use(authenticateToken);

router.post("/article/:articleId/hatke", generateHatkeForArticle);
router.get("/article/:articleId/simple", getSimplifiedVersion);
router.post("/article/:articleId/summary", generateAISummary);
router.get("/article/:articleId/share", shareHatkeSummary);

// Admin routes (you can add admin middleware later)
router.post("/batch-generate", batchGenerateHatke);

export default router;
