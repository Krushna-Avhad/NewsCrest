import express from "express";
import { getMyFeed } from "../controllers/newsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/myfeed", authMiddleware, getMyFeed);

export default router;