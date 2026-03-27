import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ✅ SIGNUP
export const signup = async (req, res) => {
  try {
    const { name, email, password, role, interests, state, city } = req.body;

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
      role,
      interests,
      state,
      city
    });

    res.json({ message: "User registered", user });

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

    // 🔐 Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // ❗ IMPORTANT FIXES HERE
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,   // MUST exist
      { expiresIn: "7d" }       // ✅ add expiry
    );

    res.json({ token, user });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};