import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import axios from "axios";

import authRoutes from "./routes/authRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import compareRoutes from "./routes/compareRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import hatkeRoutes from "./routes/hatkeRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/user", userRoutes);
app.use("/api/compare", compareRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/hatke", hatkeRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "NewsCrest API is running",
    timestamp: new Date().toISOString(),
    env: {
      hasNewsApiKey: !!process.env.NEWS_API_KEY,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasMongoUri: !!process.env.MONGO_URI,
      hasJwtSecret: !!process.env.JWT_SECRET
    }
  });
});

// Test NewsAPI endpoint
app.get("/api/test-newsapi", async (req, res) => {
  try {
    const category = req.query.category || 'general';
    const country = req.query.country || 'us'; 
    const url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`;
    
    console.log("Testing NewsAPI:", url);
    const response = await axios.get(url);
    
    console.log("Full response:", JSON.stringify(response.data, null, 2));
    
    res.json({
      success: true,
      articlesCount: response.data.articles?.length || 0,
      articles: response.data.articles?.slice(0, 2) || [], 
      source: response.data.source,
      apiKeyPresent: !!process.env.NEWS_API_KEY,
      fullResponse: response.data,
      url: url
    });
  } catch (error) {
    console.error("NewsAPI Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      apiKeyPresent: !!process.env.NEWS_API_KEY,
      apiKeyLength: process.env.NEWS_API_KEY?.length || 0
    });
  }
});

// 404 handler (must be after all routes)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({ 
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
  })
  .catch(err => console.log(err));