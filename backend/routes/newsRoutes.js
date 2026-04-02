import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { protect } from "../middleware/authMiddleware.js";
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
  getChatbotResponse,
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

// 2. 🔥 AUTH BRIDGE: Everything below this line requires a token
router.use(protect); // Use 'protect' (the one we fixed above) for everything below

// Authenticated routes only
router.use(authenticateToken);
router.post("/chat", getChatbotResponse);
router.get("/feed", getPersonalizedFeed);
router.get("/local", getLocalNewsHandler);
router.get("/saved", getSavedArticles);
router.post("/:id/save", saveArticle);
router.delete("/:id/save", unsaveArticle);

// Article by ID (must be last)
router.get("/:id", getArticle);

export default router;