import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  signup,
  login,
  getProfile,
  updateProfile,
  changePassword,
  updatePreferences,
  logout,
  verifyOtp,
  resendOtp,
} from "../controllers/authController.js";

const router = express.Router();

// ── Public routes (no token required) ────────────────────────────────────────
router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);

// ── Protected routes (JWT required) ──────────────────────────────────────────
router.use(authenticateToken);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);     // ✅ ADDED
router.put("/preferences", updatePreferences);       // ✅ ADDED
router.post("/logout", logout);

export default router;
