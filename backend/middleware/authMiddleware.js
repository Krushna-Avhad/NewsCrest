import jwt from "jsonwebtoken";
import User from "../models/User.js"; 

export default async function (req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const token = authHeader.split(" ")[1];
    
    // 1. Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. 🔥 THE CRITICAL STEP: Hand off the user to the next function
    // We fetch the user from DB so we have their City/Interests for the AI
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // Now getChatbotResponse can see 'req.user'
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
}

// backend/middleware/authMiddleware.js
export const protect = async (req, res, next) => {
  let token = req.headers.authorization;

  if (token && token.startsWith("Bearer")) {
    try {
      token = token.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findById(decoded.id).select("-password");
      
      if (!req.user) {
        console.log("❌ 401: Token valid, but User not found in DB");
        return res.status(401).json({ message: "User not found" });
      }

      next();
    } catch (error) {
      console.log("❌ 401: Token verification failed:", error.message);
      res.status(401).json({ message: "Not authorized" });
    }
  } else {
    console.log("❌ 401: No Token found in headers");
    res.status(401).json({ message: "No token" });
  }
};