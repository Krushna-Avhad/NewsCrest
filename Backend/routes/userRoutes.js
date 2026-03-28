import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { saveNews, getSavedNews } from "../controllers/userController.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.post("/save", saveNews);
router.get("/saved", getSavedNews);

export default router;