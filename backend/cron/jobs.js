// cron/jobs.js
// ─────────────────────────────────────────────────────────────────────────────
// ALL scheduled automation lives here.
// Rules:
//   - node-cron ONLY — no manual/API triggers
//   - Breaking News  → EXACTLY every 1 hour   "0 * * * *"
//   - Personalized   → EXACTLY every 2 hours  "0 */2 * * *"
//   - Daily Digest   → EXACTLY at 8:00 PM     "0 20 * * *"
//   - News Refresh   → EXACTLY every 1 hour   "0 * * * *"
//   - Story Timeline → EXACTLY every 2 hours  "30 */2 * * *"
// ─────────────────────────────────────────────────────────────────────────────

import cron from "node-cron";
import News from "../models/News.js";
import { fetchNews, saveNewsToDatabase } from "../services/newsService.js";
import { processArticleIntoTimeline } from "../services/storyTimelineService.js";
import {
  processBreakingNewsAlerts,
  processPersonalizedAlerts,
  processDailyDigest,
} from "../services/notificationService.js";

// ── News refresh helper ───────────────────────────────────────────────────────
async function refreshAllNews() {
  console.log("⏰ Scheduled Task: Refreshing all news categories...");
  const categories = [
    "top", "technology", "business", "sports", "health",
    "science", "entertainment", "politics", "education", "world", "india",
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

// ── registerCronJobs(app) ─────────────────────────────────────────────────────
// Call once after DB connects. Registers all jobs. Returns array of tasks.
export function registerCronJobs() {
  const tasks = [];

  // ── 1. News Refresh — every hour on the hour ────────────────────────────────
  tasks.push(
    cron.schedule("0 * * * *", () => {
      refreshAllNews().catch((err) =>
        console.warn("News refresh cron error:", err.message)
      );
    })
  );

  // ── 2. Breaking News Alerts — EXACTLY every 1 hour ─────────────────────────
  tasks.push(
    cron.schedule("0 * * * *", async () => {
      console.log("Running Breaking News Job");
      try {
        await processBreakingNewsAlerts();
      } catch (err) {
        console.warn("Breaking alerts cron error:", err.message);
      }
    })
  );

  // ── 3. Personalized News Alerts — EXACTLY every 2 hours ────────────────────
  tasks.push(
    cron.schedule("0 */2 * * *", async () => {
      console.log("Running Personalized News Job");
      try {
        await processPersonalizedAlerts();
      } catch (err) {
        console.warn("Personalized alerts cron error:", err.message);
      }
    })
  );

  // ── 4. Daily Digest — EXACTLY at 8:00 PM ───────────────────────────────────
  tasks.push(
    cron.schedule("0 20 * * *", async () => {
      console.log(`📅 [${new Date().toISOString()}] Processing daily digest...`);
      try {
        await processDailyDigest();
      } catch (err) {
        console.warn("Daily digest cron error:", err.message);
      }
    })
  );

  // ── 5. Story Timeline — every 2 hours at :30 ───────────────────────────────
  tasks.push(
    cron.schedule("30 */2 * * *", async () => {
      console.log("🗞️  Story Timeline: processing latest articles...");
      try {
        const recent = await News.find().sort({ publishedAt: -1 }).limit(15);
        for (const article of recent) {
          await processArticleIntoTimeline(article);
          await new Promise((r) => setTimeout(r, 600));
        }
        console.log("✅ Story Timeline batch complete.");
      } catch (err) {
        console.warn("Story Timeline cron error:", err.message);
      }
    })
  );

  console.log("✅ Cron jobs registered:");
  console.log("   Breaking News   → '0 * * * *'   (every 1 hour)");
  console.log("   Personalized    → '0 */2 * * *' (every 2 hours)");
  console.log("   Daily Digest    → '0 20 * * *'  (8:00 PM daily)");
  console.log("   News Refresh    → '0 * * * *'   (every 1 hour)");
  console.log("   Story Timeline  → '30 */2 * * *'(every 2 hours at :30)");

  return tasks;
}
