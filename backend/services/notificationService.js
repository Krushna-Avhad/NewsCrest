// services/notificationService.js
// Fully automatic notification system — controlled ONLY by cron jobs

import Alert from "../models/Alert.js";
import User  from "../models/User.js";
import News  from "../models/News.js";
import { sendNewsAlertEmail, sendDigestEmail } from "./emailService.js";
import { fetchNews, saveNewsToDatabase, mapLanguageCode } from "./newsService.js";




// ─────────────────────────────────────────────────────────────
// Shared alert creator
// ─────────────────────────────────────────────────────────────
export const createAlert = async (
  userId,
  articleId,
  type,
  priority = "medium",
  metadata = {}
) => {
  try {
    const [user, article] = await Promise.all([
      User.findById(userId),
      News.findById(articleId),
    ]);

    if (!user || !article) return null;

    // Deduplication
    const existing = await Alert.findOne({
      userId,
      articleId,
      type,
      createdAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    if (existing) return existing;

    const alert = await Alert.create({
      userId,
      articleId,
      articleUrl: article.url || "",   // ✅ FIX: store URL so frontend can navigate
      type,
      title: article.title,
      message: generateAlertMessage(article, type),
      priority,
      metadata: {
        ...metadata,
        category: article.category,
        location:
          article.location?.city || article.location?.state,
        keywords: article.tags,
      },
    });

    // Email for high priority
    if (
      user.notificationPreferences?.emailAlerts &&
      shouldSendEmail(type, priority)
    ) {
      try {
        await sendNewsAlertEmail(user.email, {
          title: article.title,
          description:
            article.summary ||
            (article.content || "").substring(0, 200),
          link: article.url,
          category:
            type === "breaking"
              ? "🚨 Breaking News"
              : article.category,
        });

        alert.isEmailSent = true;
        await alert.save();

        console.log(`📧 ${type} alert → ${user.email}`);
      } catch (err) {
        console.warn(`⚠️ Email failed: ${err.message}`);
      }
    }

    return alert;
  } catch (err) {
    console.error("createAlert error:", err.message);
    return null;
  }
};


// ─────────────────────────────────────────────────────────────
// CRON: Breaking News (hourly)
// ─────────────────────────────────────────────────────────────
export const processBreakingNewsAlerts = async () => {
  const startTime = new Date().toISOString();
  console.log(`🔔 [${startTime}] processBreakingNewsAlerts — START`);
  try {
    const breakingNews = await News.find({
      importance: "breaking",
      publishedAt: {
        $gte: new Date(Date.now() - 60 * 60 * 1000),
      },
    });

    console.log(`  📰 Found ${breakingNews.length} breaking articles in last 1h`);

    const users = await User.find({
      "notificationPreferences.breakingNews": true,
      isActive: true,
    });

    console.log(`  👥 Found ${users.length} users with breaking news ON`);

    let count = 0;

    for (const article of breakingNews) {
      for (const user of users) {
        const result = await createAlert(
          user._id,
          article._id,
          "breaking",
          "urgent"
        );
        if (result) count++;
      }
    }

    console.log(`✅ [${new Date().toISOString()}] Breaking alerts complete — ${count} created`);
  } catch (err) {
    console.error("processBreakingNewsAlerts error:", err.message);
  }
};


// ─────────────────────────────────────────────────────────────
// CRON: Personalized (every 6h)
// ─────────────────────────────────────────────────────────────
export const processPersonalizedAlerts = async () => {
  const startTime = new Date().toISOString();
  console.log(`🎯 [${startTime}] processPersonalizedAlerts — START`);
  try {
    const users = await User.find({
      "notificationPreferences.personalizedAlerts": true,
      isActive: true,
      $or: [{ isVerified: true }, { isVerified: { $exists: false } }],
    });

    console.log(`  👥 Found ${users.length} users with personalized alerts ON`);
    let total = 0;

    for (const user of users) {
      if (!user.interests?.length) {
        console.log(`  ⏭️  Skipping ${user.email} — no interests set`);
        continue;
      }

      // ✅ FIX: 2-hour cooldown guard — ensures cron schedule is enforced per-user
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const recentAlert = await Alert.findOne({
        userId: user._id,
        type: "personalized",
        createdAt: { $gte: twoHoursAgo },
      });
      if (recentAlert) {
        console.log(`  ⏭️  Skipping ${user.email} — alerted within last 2h`);
        continue;
      }

      // ✅ FIX: Read user's language from DB and map to API language code
      const userLangCode = mapLanguageCode(user.language);

      // Fetch fresh articles in user's language for their interests
      // then fall back to what's already in DB matching language
      const articles = await News.find({
        publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        category: { $in: user.interests },
        // ✅ FIX: filter by user's language so language change takes effect
        language: userLangCode,
      })
        .sort({ publishedAt: -1 })
        .limit(5);

      // If no articles in that language yet, fetch fresh from API
      if (!articles.length) {
        try {
          const fresh = await fetchNews("top", "in", 10, userLangCode);
          await saveNewsToDatabase(fresh);
          // Re-query after saving
          const refreshed = await News.find({
            publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            category: { $in: user.interests },
            language: userLangCode,
          }).sort({ publishedAt: -1 }).limit(5);
          articles.push(...refreshed);
        } catch (fetchErr) {
          console.warn(`  ⚠️  Language fetch failed for ${user.email}: ${fetchErr.message}`);
        }
      }

      if (!articles.length) {
        console.log(`  ⏭️  No articles found for ${user.email} (lang: ${userLangCode})`);
        continue;
      }

      for (const article of articles) {
        const score = calculateRelevanceScore(user, article);

        if (score >= 0.5) {
          const result = await createAlert(
            user._id,
            article._id,
            "personalized",
            "high",
            { relevanceScore: score }
          );

          if (result) total++;
        }
      }
    }

    console.log(`✅ [${new Date().toISOString()}] Personalized alerts complete — ${total} created`);
  } catch (err) {
    console.error("processPersonalizedAlerts error:", err.message);
  }
};


// ─────────────────────────────────────────────────────────────
// CRON: Daily Digest (8 AM)
// ─────────────────────────────────────────────────────────────
export const processDailyDigest = async () => {
  const startTime = new Date().toISOString();
  console.log(`📅 [${startTime}] processDailyDigest — START`);
  try {
    const users = await User.find({
      "notificationPreferences.dailyDigest": true,
      isActive: true,
      $or: [{ isVerified: true }, { isVerified: { $exists: false } }],
    });

    console.log(`  👥 Found ${users.length} users with daily digest ON`);

    for (const user of users) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const existing = await Alert.findOne({
        userId: user._id,
        type: "daily_digest",
        createdAt: { $gte: todayStart },
      });

      if (existing) continue;

      const query = {
        publishedAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      };

      if (user.interests?.length) {
        query.category = { $in: user.interests };
      } else {
        query.trending = true;
      }

      const articles = await News.find(query)
        .sort({ publishedAt: -1 })
        .limit(10);

      if (!articles.length) continue;

      const alert = await Alert.create({
        userId: user._id,
        articleId: articles[0]._id,
        type: "daily_digest",
        title: "📅 Your Daily News Digest",
        message: `Top ${articles.length} stories`,
        priority: "medium",
        metadata: {
          digestArticles: articles.map((a) => a._id),
        },
      });

      if (user.notificationPreferences?.emailAlerts) {
        try {
          await sendDigestEmail(user.email, articles);
          alert.isEmailSent = true;
          await alert.save();
        } catch (err) {
          console.warn(`⚠️ Digest email failed: ${err.message}`);
        }
      }
    }

    console.log(`✅ [${new Date().toISOString()}] Daily digest complete`);
  } catch (err) {
    console.error("processDailyDigest error:", err.message);
  }
};


// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function generateAlertMessage(article, type) {
  const map = {
    breaking: `🚨 Breaking: ${article.title}`,
    personalized: `📰 For you: ${article.title}`,
    trending: `🔥 Trending: ${article.title}`,
    daily_digest: `📅 Digest: ${article.title}`,
  };

  return map[type] || `📰 ${article.title}`;
}

function calculateRelevanceScore(user, article) {
  let score = 0.5;

  if (user.interests?.includes(article.category)) score += 0.3;
  if (user.city === article.location?.city) score += 0.2;
  if (user.state === article.location?.state) score += 0.1;

  const profileCats = getProfileCategories(user.profileType);
  if (profileCats.includes(article.category)) score += 0.2;

  return Math.min(score, 1);
}

function getProfileCategories(profileType) {
  const map = {
    Student: ["Education", "Technology", "Science"],
    "IT Employee": ["Technology", "Business", "Science"],
    Elderly: ["Health", "Politics"],
    "Business Person": ["Business", "Finance", "Technology"],
    Homemaker: ["Health", "Education"],
    "General Reader": ["World", "India", "Technology", "Health"],
  };

  return map[profileType] || map["General Reader"];
}

function shouldSendEmail(type, priority) {
  return (
    type === "breaking" ||
    (type === "personalized" && priority === "high") ||
    type === "daily_digest"
  );
}