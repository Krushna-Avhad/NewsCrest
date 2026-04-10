import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  signup,
  login,
  getProfile,
  updateProfile,
  logout,
  verifyOtp,   // ✅ ADDED
  resendOtp,   // ✅ ADDED
} from "../controllers/authController.js";

const router = express.Router();

// ── Public routes (no token required) ────────────────────────────────────────
router.post("/signup", signup);          // Step 1: register & get OTP email
router.post("/verify-otp", verifyOtp);  // ✅ ADDED  Step 2: verify OTP → get JWT
router.post("/resend-otp", resendOtp);  // ✅ ADDED  Resend if OTP expired
router.post("/login", login);           // Login with verified account

// ── Protected routes (JWT required) ──────────────────────────────────────────
router.use(authenticateToken);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post("/logout", logout);

export default router;
