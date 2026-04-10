import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import compareRoutes from "./routes/compareRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import hatkeRoutes from "./routes/hatkeRoutes.js";
import storyTimelineRoutes from "./routes/storyTimelineRoutes.js";
import perspectiveRoutes from "./routes/perspectiveRoutes.js";

import News from "./models/News.js";
import "./models/UserActivity.js";
import { fetchNews, saveNewsToDatabase } from "./services/newsService.js";
import { verifyEmailConnection } from "./services/emailService.js";
import factCheckRoutes from "./routes/factCheckRoutes.js";

// ✅ FIX: All cron jobs centralised in cron/jobs.js — no inline scheduling
import { registerCronJobs } from "./cron/jobs.js";

const app = express();

app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",    authRoutes);
app.use("/api/news",    newsRoutes);
app.use("/api/user",    userRoutes);
app.use("/api/fact-check", factCheckRoutes);
app.use("/api/tasks",   taskRoutes);
app.use("/api/alerts",  alertRoutes);
app.use("/api/search",  searchRoutes);
app.use("/api/chatbot",   chatbotRoutes);
app.use("/api/hatke",    hatkeRoutes);
app.use("/api/timeline", storyTimelineRoutes);
app.use("/api/perspective", perspectiveRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "NewsCrest API is running",
    timestamp: new Date().toISOString(),
    env: {
      hasNewsApiKey:  !!process.env.NEWS_API_KEY,
      hasGeminiKey:   !!process.env.GEMINI_API_KEY,
      hasMongoUri:    !!process.env.MONGO_URI,
      hasJwtSecret:   !!process.env.JWT_SECRET,
      emailConfigured:
        !!(process.env.EMAIL_USER &&
           process.env.EMAIL_USER !== "your_email@gmail.com" &&
           process.env.EMAIL_PASS &&
           process.env.EMAIL_PASS !== "your_16char_app_password"),
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
  try {
    const count = await News.countDocuments();

    // Change this to 'false' ONLY if you want to force a refresh right now
    if (count >= 200) {
      console.log(`✅ News DB has ${count} articles — skipping seed.`);
      return;
    }

    // if (false) {
    //   console.log(`✅ News DB has ${count} articles — skipping seed.`);
    //   return;
    // }

    console.log(
      `📰 Only ${count} articles — fetching fresh news from NewsData...`,
    );

    const categories = [
      "top",
      "technology",
      "business",
      "sports",
      "health",
      "science",
      "entertainment",
      "politics",
      "education",
      "world",
      "india",
    ];

    let totalSaved = 0;

    for (const cat of categories) {
      try {
        let articles;

        // 🔥 THE INDIA FIX:
        // NewsData.io doesn't have a category 'india', so we fetch by country code 'in'
        if (cat === "india") {
          articles = await fetchNews("top", "in", 10);
          // Manually label these so the Frontend finds them under the "India" tab
          articles = articles.map((a) => ({ ...a, category: "India" }));
        } else {
          articles = await fetchNews(cat, "in", 10);
        }

        if (articles && articles.length > 0) {
          const saved = await saveNewsToDatabase(articles);
          console.log(`  ✔ ${cat}: ${saved.length} new articles saved.`);
          totalSaved += saved.length;
        }

        // 1-second pause to respect API rate limits
        await new Promise((r) => setTimeout(r, 3000));
      } catch (err) {
        console.warn(`  ✘ Failed ${cat}: ${err.message}`);
      }
    }

    // --- Safety Check from Previous Version ---
    if (totalSaved === 0 && count === 0) {
      console.error("❌ No articles saved. Check your NEWS_API_KEY in .env");
      return;
    }

    // --- Efficient Trending Update ---
    // Marks the 30 most recent articles as trending in one single database call
    await News.updateMany(
      { publishedAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } }, // Last 48 hours
      { $set: { trending: true } },
    ).limit(30);

    console.log(`✅ Seed complete — ${totalSaved} articles added to DB.`);
  } catch (error) {
    console.error("Seed Error:", error.message);
  }
}
// ── Connect DB then start server ──────────────────────────────────────────────
// --- 1. Background Refresh Function ---
// This handles the actual logic of updating your database categories
// async function refreshAllNews() {
//   console.log("⏰ Scheduled Task: Refreshing all news categories...");

//   const categories = [
//     "top", "technology", "business", "health",
//     "science", "sports", "entertainment", "politics", "education"
//   ];

//   for (const cat of categories) {
//     try {
//       // Fetch 10 articles for each specific category from India
//       const articles = await fetchNews(cat, "in", 10);

//       // Save to DB (Service handles duplicate checking by URL/Title)
//       const saved = await saveNewsToDatabase(articles);

//       console.log(`  ✔ Refreshed ${cat}: ${saved.length} new articles saved.`);

//       // 1-second delay to stay within API rate limits
//       await new Promise(r => setTimeout(r, 1000));
//     } catch (err) {
//       console.warn(`  ✘ Failed to refresh ${cat}: ${err.message}`);
//     }
//   }
//   console.log("✅ Scheduled refresh complete.");
// }

async function refreshAllNews() {
  console.log("⏰ Scheduled Task: Refreshing all news categories...");
  const categories = [
    "top",
    "technology",
    "business",
    "sports",
    "health",
    "science",
    "entertainment",
    "politics",
    "education",
    "world",
    "india",
  ];

  for (const cat of categories) {
    try {
      let articles;
      if (cat === "india") {
        articles = await fetchNews("top", "in", 10);
        articles = articles.map((a) => ({ ...a, category: "India" }));
      } else {
        articles = await fetchNews(cat, "in", 10);
      }

      const saved = await saveNewsToDatabase(articles);
      console.log(`  ✔ Refreshed ${cat}: ${saved.length} new articles.`);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.warn(`  ✘ Failed ${cat}: ${err.message}`);
    }
  }
}

// --- 2. Database Connection & Server Startup ---
// ── DB connect + start ────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    // ── Verify email config now that all env vars are loaded ─────────────────
    verifyEmailConnection();

    await seedNews();

    // ✅ FIX: All cron jobs registered from cron/jobs.js — single source of truth
    registerCronJobs();

    // Start the Express server
    console.log("🔍 Debug - process.env.PORT:", process.env.PORT);
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("📅 News automation is active (Runs every hour)");
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err.message);
  });
