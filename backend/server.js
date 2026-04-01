import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes    from "./routes/authRoutes.js";
import newsRoutes    from "./routes/newsRoutes.js";
import userRoutes    from "./routes/userRoutes.js";
import compareRoutes from "./routes/compareRoutes.js";
import taskRoutes    from "./routes/taskRoutes.js";
import alertRoutes   from "./routes/alertRoutes.js";
import searchRoutes  from "./routes/searchRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import hatkeRoutes   from "./routes/hatkeRoutes.js";

import News from "./models/News.js";
import { fetchNews, saveNewsToDatabase } from "./services/newsService.js";

const app = express();

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",    authRoutes);
app.use("/api/news",    newsRoutes);
app.use("/api/user",    userRoutes);
app.use("/api/compare", compareRoutes);
app.use("/api/tasks",   taskRoutes);
app.use("/api/alerts",  alertRoutes);
app.use("/api/search",  searchRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/hatke",   hatkeRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "NewsCrest API is running",
    timestamp: new Date().toISOString(),
    env: {
      hasNewsApiKey: !!process.env.NEWS_API_KEY,
      hasGeminiKey:  !!process.env.GEMINI_API_KEY,
      hasMongoUri:   !!process.env.MONGO_URI,
      hasJwtSecret:  !!process.env.JWT_SECRET,
    },
  });
});

// ── 404 / error handlers ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ── Seed news — runs if DB has fewer than 20 articles ────────────────────────
async function seedNews() {
  const count = await News.countDocuments();

  if (count >= 20) {
    console.log(`✅ News DB has ${count} articles — skipping seed.`);
    return;
  }

  console.log(`📰 Only ${count} articles in DB — fetching fresh news from NewsAPI...`);

  const categories = ["general", "technology", "business", "health", "science", "sports", "entertainment"];
  let total = 0;

  for (const cat of categories) {
    try {
      // Fetch from India first, then US for broader coverage
      const [indiaArticles, usArticles] = await Promise.all([
        fetchNews(cat, "in", 20),
        fetchNews(cat, "us", 20),
      ]);
      const all = [...indiaArticles, ...usArticles];
      const saved = await saveNewsToDatabase(all);
      total += saved.length;
      console.log(`  ✔ ${cat}: ${saved.length} new articles saved (fetched ${all.length})`);
    } catch (err) {
      console.warn(`  ✘ ${cat}: ${err.message}`);
    }
  }

  if (total === 0) {
    console.error("❌ No articles saved. Check your NEWS_API_KEY in .env");
    console.error("   Get a free key at: https://newsapi.org/register");
    return;
  }

  // Mark articles with high engagement or from top sources as trending
  try {
    const recent = await News.find().sort({ publishedAt: -1 }).limit(30);
    for (const article of recent) {
      article.trending = true;
      await article.save();
    }
    console.log(`  ✔ Marked ${recent.length} recent articles as trending`);
  } catch (_) {}

  console.log(`✅ Seed complete — ${total} articles saved to DB.`);
}

// ── Connect DB then start server ──────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");
    await seedNews();
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => console.error("❌ MongoDB connection failed:", err));
