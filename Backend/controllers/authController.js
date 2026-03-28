import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ✅ SIGNUP
export const signup = async (req, res) => {
  try {
    const { name, email, password, profileType, interests, country, state, city, notificationPreferences } = req.body;

    // 🔴 Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      profileType: profileType || 'General Reader',
      interests: interests || [],
      country: country || 'India',
      state,
      city,
      notificationPreferences: {
        emailAlerts: notificationPreferences?.emailAlerts ?? true,
        breakingNews: notificationPreferences?.breakingNews ?? true,
        personalizedAlerts: notificationPreferences?.personalizedAlerts ?? true,
        dailyDigest: notificationPreferences?.dailyDigest ?? false
      }
    });

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ 
      message: "User registered successfully", 
      token, 
      user: userResponse 
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔍 Check user
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    // 🔐 Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ 
      message: "Login successful", 
      token, 
      user: userResponse 
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET USER PROFILE
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ UPDATE PROFILE
export const updateProfile = async (req, res) => {
  try {
    const { name, profileType, interests, country, state, city, notificationPreferences } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (profileType) updateData.profileType = profileType;
    if (interests) updateData.interests = interests;
    if (country) updateData.country = country;
    if (state) updateData.state = state;
    if (city) updateData.city = city;
    if (notificationPreferences) updateData.notificationPreferences = notificationPreferences;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ 
      message: "Profile updated successfully", 
      user 
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ LOGOUT (Client-side token removal, but we can track last activity)
export const logout = async (req, res) => {
  try {
    // Update last activity
    await User.findByIdAndUpdate(req.user.id, { lastLogin: new Date() });
    res.json({ message: "Logout successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};