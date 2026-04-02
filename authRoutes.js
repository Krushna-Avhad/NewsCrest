import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { signup, login, verifyOtp, getProfile, updateProfile, logout } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);

router.use(authenticateToken);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post("/logout", logout);

export default router;