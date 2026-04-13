// controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOtpEmail } from "../services/emailService.js";
import { processUserNotifications } from "../services/notificationService.js";

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── SIGNUP ────────────────────────────────────────────────────────────────────
export const signup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      profileType,
      interests,
      country,
      state,
      city,
      notificationPreferences,
    } = req.body;

    if (!name || !email || !password)
      return res
        .status(400)
        .json({ message: "Name, email and password are required." });
    if (password.length < 6)
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      if (existingUser.isVerified)
        return res
          .status(409)
          .json({ message: "Email is already registered. Please log in." });

      // Unverified remnant — resend OTP
      const otp = generateOtp();
      existingUser.otp = otp;
      existingUser.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
      await existingUser.save();
      await sendOtpEmail(email, otp);
      return res
        .status(200)
        .json({
          message:
            "A new OTP has been sent. Please verify to complete registration.",
        });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOtp();

    await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      profileType: profileType || "General Reader",
      interests: interests || [],
      country: country || "India",
      state,
      city,
      notificationPreferences: {
        emailAlerts: notificationPreferences?.emailAlerts ?? true,
        breakingNews: notificationPreferences?.breakingNews ?? true,
        personalizedAlerts: notificationPreferences?.personalizedAlerts ?? true,
        dailyDigest: notificationPreferences?.dailyDigest ?? false,
      },
      otp,
      otpExpiry: new Date(Date.now() + OTP_TTL_MS),
      isVerified: false,
    });

    await sendOtpEmail(email, otp);
    return res
      .status(201)
      .json({
        message: "OTP sent to your email. Please verify within 10 minutes.",
      });
  } catch (err) {
    console.error("signup error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── VERIFY OTP ────────────────────────────────────────────────────────────────
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required." });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res
        .status(404)
        .json({ message: "No account found with this email." });
    if (user.isVerified)
      return res
        .status(400)
        .json({ message: "Email already verified. Please log in." });
    if (!user.otp || user.otp !== String(otp).trim())
      return res
        .status(400)
        .json({ message: "Invalid OTP. Please check and try again." });
    if (!user.otpExpiry || user.otpExpiry < Date.now())
      return res
        .status(400)
        .json({ message: "OTP has expired. Please request a new one." });

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.otp;
    delete userResponse.otpExpiry;

    // Fire-and-forget: send first-login notifications
    processUserNotifications(user._id).catch((e) =>
      console.warn("Post-verify notifications error:", e.message),
    );

    return res.status(200).json({
      message: "Email verified! Welcome to NewsCrest.",
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error("verifyOtp error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── RESEND OTP ────────────────────────────────────────────────────────────────
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res
        .status(404)
        .json({ message: "No account found with this email." });
    if (user.isVerified)
      return res
        .status(400)
        .json({ message: "Account already verified. Please log in." });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
    await user.save();
    await sendOtpEmail(email, otp);

    return res
      .status(200)
      .json({ message: "New OTP sent. Valid for 10 minutes." });
  } catch (err) {
    console.error("resendOtp error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isActive)
      return res.status(403).json({ message: "Account is deactivated" });

    // Legacy users (registered before OTP system) have isVerified = undefined/null
    const isLegacyUser =
      user.isVerified === undefined || user.isVerified === null;
    if (!isLegacyUser && user.isVerified === false) {
      return res.status(403).json({
        message: "Email not verified. Please check your email for the OTP.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Auto-verify legacy users
    if (isLegacyUser) user.isVerified = true;
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ message: "Login successful", token, user: userResponse });

    // ── Fire-and-forget: process personalised notifications after login ────────
    // This runs AFTER the response is sent so login stays fast.
    processUserNotifications(user._id).catch((e) =>
      console.warn("Post-login notifications error:", e.message),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET PROFILE ───────────────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── UPDATE PROFILE ────────────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const {
      name,
      profileType,
      interests,
      country,
      state,
      city,
      notificationPreferences,
      textSize,
      language,
      feedLayout,
    } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (profileType) updateData.profileType = profileType;
    if (interests) updateData.interests = interests;
    if (country) updateData.country = country;
    if (state !== undefined) updateData.state = state;
    if (city !== undefined) updateData.city = city;
    if (notificationPreferences)
      updateData.notificationPreferences = notificationPreferences;
    // ✅ ADDED: persist reading preferences
    if (textSize) updateData.textSize = textSize;
    if (language) updateData.language = language;
    if (feedLayout) updateData.feedLayout = feedLayout;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── CHANGE PASSWORD ───────────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res
        .status(400)
        .json({ message: "Old and new password are required." });
    if (newPassword.length < 6)
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters." });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── UPDATE PREFERENCES (reading prefs + notifications) ───────────────────────
export const updatePreferences = async (req, res) => {
  try {
    const { textSize, language, feedLayout, notificationPreferences } =
      req.body;
    const updateData = {};
    if (textSize) updateData.textSize = textSize;
    if (language) updateData.language = language;
    if (feedLayout) updateData.feedLayout = feedLayout;
    if (notificationPreferences)
      updateData.notificationPreferences = notificationPreferences;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({ message: "Preferences updated successfully", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── LOGOUT ────────────────────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { lastLogin: new Date() });
    res.json({ message: "Logout successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
//4. authController.js
//git add backend/controllers/authController.js
//git commit -m "feat: add changePassword and updatePreferences controller endpoints"
