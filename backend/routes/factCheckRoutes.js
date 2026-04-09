import express from "express";
import { verifyNews } from "../controllers/factCheckController.js";

const router = express.Router();

router.post("/", verifyNews);

export default router;