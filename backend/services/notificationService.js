// services/notificationService.js
// Fully automatic notification system — triggered on login + cron jobs
import Alert from "../models/Alert.js";
import User  from "../models/User.js";
import News  from "../models/News.js";
import { sendNewsAlertEmail, sendDigestEmail } from "./emailService.js";

// ─────────────────────────────────────────────────────────────────────────────
// CORE: processUserNotifications(userId)
// Called automatically after every successful login.
// Fetches news matching user interests, saves DB alerts, sends emails.
// ─────────────────────────────────────────────────────────────────────────────
export const processUserNotifications = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.isActive) return;

    // Only verified users get notifications
    const isVerified = user.isVerified === true ||
      user.isVerified === undefined ||
      user.isVerified === null; // legacy users
    if (!isVerified) return;

    // Skip if personalizedAlerts is disabled
    if (!user.notificationPreferences?.personalizedAlerts) return;

    // Prevent spam: don't process again if already done within last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recentAlert = await Alert.findOne({
      userId,
      type: "personalized",
      createdAt: { $gte: sixHoursAgo },
    });
    if (recentAlert) {
      console.log(`⏭️  Skipping login notifications for ${user.email} — processed recently`);
      return;
    }

    // Build news query based on interests
    const interests = user.interests?.length > 0 ? user.interests : null;
    const newsQuery = {
      publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    };
    if (interests) {
      newsQuery.category = { $in: interests };
    } else {
      // No interests set — fall back to high-importance or trending news
      newsQuery.$or = [
        { importance: { $in: ["high", "breaking"] } },
        { trending: true },
      ];
    }

    // Fetch top 5 matching articles
    const articles = await News.find(newsQuery)
      .sort({ importance: -1, publishedAt: -1 })
      .limit(5);

    if (articles.length === 0) {
      console.log(`ℹ️  No matching news for ${user.email}`);
      return;
    }

    const createdAlerts = [];

    for (const article of articles) {
      // Deduplication: skip if this article was already alerted to this user today
      const alreadyAlerted = await Alert.findOne({
        userId,
        articleId: article._id,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });
      if (alreadyAlerted) continue;

      const alert = await Alert.create({
        userId,
        articleId: article._id,
        type: "personalized",
        title: article.title,
        message: `📰 News matching your interests: ${article.title}`,
        priority: article.importance === "breaking" ? "urgent"
          : article.importance === "high"    ? "high"
          : "medium",
        isEmailSent: false,
        metadata: {
          category:       article.category,
          relevanceScore: calculateRelevanceScore(user, article),
          keywords:       article.tags || [],
        },
      });

      createdAlerts.push({ alert, article });
    }

    if (createdAlerts.length === 0) {
      console.log(`⏭️  All articles already alerted for ${user.email}`);
      return;
    }

    console.log(`✅ Created ${createdAlerts.length} alerts for ${user.email}`);

    // Send email if emailAlerts is enabled
    if (user.notificationPreferences?.emailAlerts) {
      try {
        // Send one summary email with all matched articles
        await sendLoginAlertEmail(user.email, createdAlerts.map((x) => x.article));

        // Mark all as emailed
        await Alert.updateMany(
          { _id: { $in: createdAlerts.map((x) => x.alert._id) } },
          { isEmailSent: true }
        );

        console.log(`📧 Login alert email sent to ${user.email}`);
      } catch (emailErr) {
        console.warn(`⚠️  Email failed for ${user.email}:`, emailErr.message);
      }
    }
  } catch (err) {
    console.error("processUserNotifications error:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Send a "You have new articles" login email
// ─────────────────────────────────────────────────────────────────────────────
async function sendLoginAlertEmail(email, articles) {
  await sendDigestEmail(email, articles, {
    subject: "📰 NewsCrest — Your Personalised News Alerts",
    heading: "News matching your interests",
    subheading: `${articles.length} new article${articles.length > 1 ? "s" : ""} since your last visit`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// createAlert — shared helper used by cron jobs
// ─────────────────────────────────────────────────────────────────────────────
export const createAlert = async (userId, articleId, type, priority = "medium", metadata = {}) => {
  try {
    const [user, article] = await Promise.all([
      User.findById(userId),
      News.findById(articleId),
    ]);
    if (!user || !article) return null;

    // Deduplication
    const existing = await Alert.findOne({
      userId, articleId, type,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    if (existing) return existing;

    const alert = await Alert.create({
      userId,
      articleId,
      type,
      title:   article.title,
      message: generateAlertMessage(article, type),
      priority,
      metadata: {
        ...metadata,
        category:       article.category,
        relevanceScore: calculateRelevanceScore(user, article),
        keywords:       article.tags || [],
      },
    });

    // Send individual email for breaking / high-priority alerts
    if (user.notificationPreferences?.emailAlerts && shouldSendEmail(type, priority)) {
      try {
        await sendNewsAlertEmail(user.email, {
          title:       article.title,
          description: article.summary || (article.content || "").substring(0, 200),
          link:        article.url,
          category:    type === "breaking" ? "🚨 Breaking News" : article.category,
        });
        alert.isEmailSent = true;
        await alert.save();
        console.log(`📧 ${type} alert email → ${user.email}`);
      } catch (emailErr) {
        console.warn(`⚠️  Email failed for ${user.email}:`, emailErr.message);
      }
    }

    return alert;
  } catch (err) {
    console.error("createAlert error:", err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CRON: processBreakingNewsAlerts
// ─────────────────────────────────────────────────────────────────────────────
export const processBreakingNewsAlerts = async () => {
  try {
    const breakingNews = await News.find({
      importance:  "breaking",
      publishedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });

    const users = await User.find({
      "notificationPreferences.breakingNews": true,
      isActive: true,
    });

    let count = 0;
    for (const article of breakingNews) {
      for (const user of users) {
        const result = await createAlert(user._id, article._id, "breaking", "urgent", {
          category: article.category,
        });
        if (result) count++;
      }
    }
    console.log(`✅ Breaking alerts: ${count} created for ${users.length} users`);
  } catch (err) {
    console.error("processBreakingNewsAlerts error:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CRON: processPersonalizedAlerts (for ALL users at once, runs every 6h)
// ─────────────────────────────────────────────────────────────────────────────
export const processPersonalizedAlerts = async () => {
  try {
    const users = await User.find({
      "notificationPreferences.personalizedAlerts": true,
      isActive: true,
      $or: [{ isVerified: true }, { isVerified: { $exists: false } }],
    });

    let totalCount = 0;
    for (const user of users) {
      if (!user.interests?.length) continue;

      const articles = await News.find({
        publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        category:    { $in: user.interests },
      }).sort({ publishedAt: -1 }).limit(5);

      for (const article of articles) {
        const score = calculateRelevanceScore(user, article);
        if (score >= 0.7) {
          const result = await createAlert(user._id, article._id, "personalized", "high", { relevanceScore: score });
          if (result) totalCount++;
        }
      }
    }
    console.log(`✅ Personalized alerts: ${totalCount} created for ${users.length} users`);
  } catch (err) {
    console.error("processPersonalizedAlerts error:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CRON: processDailyDigest (runs at 8 AM)
// ─────────────────────────────────────────────────────────────────────────────
export const processDailyDigest = async () => {
  try {
    const users = await User.find({
      "notificationPreferences.dailyDigest": true,
      isActive: true,
      $or: [{ isVerified: true }, { isVerified: { $exists: false } }],
    });

    for (const user of users) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Skip if digest already sent today
      const existingDigest = await Alert.findOne({
        userId: user._id,
        type:   "daily_digest",
        createdAt: { $gte: todayStart },
      });
      if (existingDigest) continue;

      const query = { publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
      if (user.interests?.length > 0) {
        query.category = { $in: user.interests };
      } else {
        query.trending = true;
      }

      const topArticles = await News.find(query).sort({ publishedAt: -1 }).limit(10);
      if (topArticles.length === 0) continue;

      const digestAlert = await Alert.create({
        userId:    user._id,
        articleId: topArticles[0]._id,
        type:      "daily_digest",
        title:     "📅 Your Daily News Digest",
        message:   `Top ${topArticles.length} stories matching your interests`,
        priority:  "medium",
        metadata:  { digestArticles: topArticles.map((a) => a._id), category: "digest" },
      });

      if (user.notificationPreferences?.emailAlerts) {
        try {
          await sendDigestEmail(user.email, topArticles);
          digestAlert.isEmailSent = true;
          await digestAlert.save();
          console.log(`📧 Daily digest emailed to ${user.email}`);
        } catch (emailErr) {
          console.warn(`⚠️  Digest email failed for ${user.email}:`, emailErr.message);
        }
      }
    }
    console.log(`✅ Daily digest processed for ${users.length} users`);
  } catch (err) {
    console.error("processDailyDigest error:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function generateAlertMessage(article, type) {
  const map = {
    breaking:     `🚨 Breaking: ${article.title}`,
    personalized: `📰 For you: ${article.title}`,
    location:     `📍 Local: ${article.title}`,
    interest:     `🎯 Your interest: ${article.title}`,
    trending:     `🔥 Trending: ${article.title}`,
    daily_digest: `📅 Digest: ${article.title}`,
  };
  return map[type] || `📰 ${article.title}`;
}

function calculateRelevanceScore(user, article) {
  let score = 0.5;
  if (user.interests?.includes(article.category))          score += 0.3;
  if (user.city  && article.location?.city  === user.city)  score += 0.2;
  if (user.state && article.location?.state === user.state) score += 0.1;
  const profileCats = getProfileCategories(user.profileType);
  if (profileCats.includes(article.category))              score += 0.2;
  return Math.min(score, 1.0);
}

function getProfileCategories(profileType) {
  const map = {
    Student:            ["Education", "Technology", "Science"],
    "IT Employee":      ["Technology", "Business", "Science"],
    Elderly:            ["Health", "Politics", "Education"],
    "Business Person":  ["Business", "Finance", "Politics", "Technology"],
    Homemaker:          ["Health", "Education"],
    "General Reader":   ["Top Headlines", "World", "India", "Technology", "Health"],
  };
  return map[profileType] || map["General Reader"];
}

function shouldSendEmail(type, priority) {
  const rules = {
    breaking:     true,
    personalized: priority === "high",
    location:     priority === "high",
    interest:     priority === "high",
    trending:     false,
    daily_digest: true,
  };
  return rules[type] ?? false;
}
