import express from "express";
import { compareHandler } from "../controllers/searchController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, compareHandler);

export default router;