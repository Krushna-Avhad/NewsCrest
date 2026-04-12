// services/notificationService.js
// Fully automatic notification system — triggered on login + cron jobs

import Alert from "../models/Alert.js";
import User  from "../models/User.js";
import News  from "../models/News.js";
import { sendNewsAlertEmail, sendDigestEmail } from "./emailService.js";


// ─────────────────────────────────────────────────────────────
// CORE: processUserNotifications(userId)
// Triggered after login
// ─────────────────────────────────────────────────────────────
export const processUserNotifications = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.isActive) return;

    // Allow legacy users
    const isVerified =
      user.isVerified === true ||
      user.isVerified === undefined ||
      user.isVerified === null;

    if (!isVerified) return;

    if (!user.notificationPreferences?.personalizedAlerts) return;

    // Prevent spam (6h cooldown)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recentAlert = await Alert.findOne({
      userId,
      type: "personalized",
      createdAt: { $gte: sixHoursAgo },
    });

    if (recentAlert) {
      console.log(`⏭️ Skipping login notifications for ${user.email}`);
      return;
    }

    // Build query
    const interests = user.interests?.length ? user.interests : null;

    const newsQuery = {
      publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    };

    if (interests) {
      newsQuery.category = { $in: interests };
    } else {
      newsQuery.$or = [
        { importance: { $in: ["high", "breaking"] } },
        { trending: true },
      ];
    }

    // Fetch articles
    const articles = await News.find(newsQuery)
      .sort({ importance: -1, publishedAt: -1 })
      .limit(5);

    if (!articles.length) return;

    const createdAlerts = [];

    for (const article of articles) {
      const alreadyAlerted = await Alert.findOne({
        userId,
        articleId: article._id,
        createdAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      });

      if (alreadyAlerted) continue;

      const alert = await Alert.create({
        userId,
        articleId: article._id,
        type: "personalized",
        title: article.title,
        message: `📰 News matching your interests: ${article.title}`,
        priority:
          article.importance === "breaking"
            ? "urgent"
            : article.importance === "high"
            ? "high"
            : "medium",
        isEmailSent: false,
        metadata: {
          category: article.category,
          relevanceScore: calculateRelevanceScore(user, article),
          keywords: article.tags || [],
        },
      });

      createdAlerts.push({ alert, article });
    }

    if (!createdAlerts.length) return;

    console.log(`✅ Created ${createdAlerts.length} alerts for ${user.email}`);

    // Send email summary
    if (user.notificationPreferences?.emailAlerts) {
      try {
        await sendLoginAlertEmail(
          user.email,
          createdAlerts.map((x) => x.article)
        );

        await Alert.updateMany(
          { _id: { $in: createdAlerts.map((x) => x.alert._id) } },
          { isEmailSent: true }
        );

        console.log(`📧 Email sent to ${user.email}`);
      } catch (err) {
        console.warn(`⚠️ Email failed: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("processUserNotifications error:", err.message);
  }
};


// ─────────────────────────────────────────────────────────────
// Login email helper
// ─────────────────────────────────────────────────────────────
const sendLoginAlertEmail = async (email, articles) => {
  await sendDigestEmail(email, articles, {
    subject: "📰 NewsCrest — Your Personalised News Alerts",
    heading: "News matching your interests",
    subheading: `${articles.length} new article${
      articles.length > 1 ? "s" : ""
    }`,
  });
};


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

      const articles = await News.find({
        publishedAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        category: { $in: user.interests },
      })
        .sort({ publishedAt: -1 })
        .limit(5);

      for (const article of articles) {
        const score = calculateRelevanceScore(user, article);

        // ✅ FIXED: lowered threshold from 0.7 → 0.5 so interest-matched articles always qualify
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
//6. notificationService.js
//git add backend/services/notificationService.js
//git commit -m "fix: lower relevance threshold to 0.5 and add cron job debug logging"