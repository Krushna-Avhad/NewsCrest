import express from "express";
import { saveNews, getSavedNews } from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/save", authMiddleware, saveNews);
router.get("/saved", authMiddleware, getSavedNews);

export default router;