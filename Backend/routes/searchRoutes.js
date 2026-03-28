import express from "express";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import {
  searchNewsHandler,
  getTrendingTopics,
  exploreByCategory,
  exploreByLocation,
  exploreBySource,
  getSearchSuggestions,
  getSearchHistory,
  clearSearchHistory
} from "../controllers/searchController.js";

const router = express.Router();

// Public routes (no authentication required)
router.get("/trending", getTrendingTopics);
router.get("/suggestions", getSearchSuggestions);
router.get("/explore/category", exploreByCategory);
router.get("/explore/location", exploreByLocation);
router.get("/explore/source", exploreBySource);

// Optional authentication (personalizes results)
router.use(optionalAuth);

// Search with optional authentication
router.get("/", searchNewsHandler);

// Authenticated routes only
router.use(authenticateToken);
router.get("/history", getSearchHistory);
router.delete("/history", clearSearchHistory);

export default router;