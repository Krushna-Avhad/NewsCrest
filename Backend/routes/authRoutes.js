import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { signup, login, getProfile, updateProfile, logout } from "../controllers/authController.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Authenticated routes
router.use(authenticateToken);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post("/logout", logout);

export default router;