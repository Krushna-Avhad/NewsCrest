import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getAllNews,
  getPersonalizedFeed,
  getTopHeadlines,
  getTrendingNews,
  getCategoryNews,
  getLocalNewsHandler,
  getGoodNewsHandler,
  getArticle,
  saveArticle,
  unsaveArticle,
  getSavedArticles,
  refreshNews
} from "../controllers/newsController.js";

const router = express.Router();

// Public routes (no authentication required)
router.get("/", getAllNews);
router.get("/headlines", getTopHeadlines);
router.get("/trending", getTrendingNews);
router.get("/category/:category", getCategoryNews);
router.get("/good", getGoodNewsHandler);
router.post("/refresh", refreshNews);

// Authenticated routes only
router.use(authenticateToken);
router.get("/feed", getPersonalizedFeed);
router.get("/local", getLocalNewsHandler);
router.get("/saved", getSavedArticles);
router.post("/:id/save", saveArticle);
router.delete("/:id/save", unsaveArticle);

// Article by ID (must be last)
router.get("/:id", getArticle);

export default router;