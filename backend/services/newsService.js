import axios from "axios";
import News from "../models/News.js";
import User from "../models/User.js";
import { sendBulkNewsAlert } from "./emailService.js";

// ── Sentiment Analysis (keyword-based, no API needed) ────────────────────────
const POSITIVE_WORDS = [
  "win",
  "wins",
  "won",
  "victory",
  "success",
  "breakthrough",
  "launch",
  "launches",
  "record",
  "growth",
  "rise",
  "rises",
  "rises",
  "improve",
  "improved",
  "improvement",
  "achieve",
  "achieves",
  "achieved",
  "achievement",
  "award",
  "awards",
  "celebrate",
  "celebrates",
  "celebrated",
  "celebration",
  "historic",
  "milestone",
  "relief",
  "recover",
  "recovery",
  "recovers",
  "boost",
  "boosts",
  "boosted",
  "save",
  "saves",
  "saved",
  "rescue",
  "rescues",
  "rescued",
  "hope",
  "good",
  "great",
  "best",
  "positive",
  "benefit",
  "benefits",
  "help",
  "helps",
  "helped",
  "support",
  "peace",
  "agreement",
  "deal",
  "approved",
  "approve",
  "progress",
  "upgrade",
  "innovation",
  "inspiring",
  "inspired",
  "inspire",
  "happy",
  "happiness",
  "joy",
  "profit",
  "profits",
  "surplus",
  "grant",
  "grants",
  "free",
  "safe",
  "safety",
];

const NEGATIVE_WORDS = [
  "war",
  "wars",
  "attack",
  "attacks",
  "attacked",
  "kill",
  "kills",
  "killed",
  "death",
  "deaths",
  "dead",
  "dies",
  "died",
  "die",
  "murder",
  "murders",
  "murdered",
  "crash",
  "crashes",
  "crashed",
  "accident",
  "accidents",
  "fire",
  "fires",
  "flood",
  "floods",
  "disaster",
  "disasters",
  "crisis",
  "crises",
  "collapse",
  "collapses",
  "collapsed",
  "fail",
  "fails",
  "failed",
  "failure",
  "loss",
  "loses",
  "lost",
  "drop",
  "drops",
  "dropped",
  "fall",
  "falls",
  "fell",
  "ban",
  "bans",
  "banned",
  "arrest",
  "arrests",
  "arrested",
  "charge",
  "charges",
  "charged",
  "scam",
  "scams",
  "fraud",
  "frauds",
  "corrupt",
  "corruption",
  "protest",
  "protests",
  "riot",
  "riots",
  "violence",
  "violent",
  "threat",
  "threats",
  "threatened",
  "danger",
  "dangerous",
  "damage",
  "damages",
  "damaged",
  "destroy",
  "destroys",
  "destroyed",
  "destruction",
  "explosion",
  "explode",
  "bomb",
  "bombs",
  "terror",
  "terrorism",
  "terrorist",
  "shortage",
  "shortages",
  "inflation",
  "recession",
  "debt",
  "deficit",
  "poverty",
  "unemployment",
  "strike",
  "strikes",
  "scandal",
  "controversy",
  "controversial",
  "leak",
  "leaks",
];

function detectSentiment(title, content) {
  const text = `${title || ""} ${content || ""}`.toLowerCase();
  const words = text.split(/\W+/);

  let positiveScore = 0;
  let negativeScore = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.includes(word)) positiveScore++;
    if (NEGATIVE_WORDS.includes(word)) negativeScore++;
  }

  if (positiveScore > negativeScore) return "positive";
  if (negativeScore > positiveScore) return "negative";
  return "neutral";
}

// ── Importance Detection ✅ ADDED ─────────────────────────────────────────────
const BREAKING_KEYWORDS = [
  "breaking", "urgent", "alert", "emergency", "critical", "just in",
  "live update", "developing", "flash", "exclusive", "war", "earthquake",
  "blast", "explosion", "terror", "attack", "killed", "dead", "crash",
  "disaster", "crisis", "riot", "fire", "flood", "cyclone", "tsunami"
];

const HIGH_IMPORTANCE_KEYWORDS = [
  "election", "pm modi", "president", "supreme court", "parliament",
  "rbi", "budget", "policy", "gdp", "inflation", "recession",
  "global", "worldwide", "national", "historic", "landmark", "record"
];

const HIGH_ENGAGEMENT_CATEGORIES = ["Politics", "India", "World", "Top Headlines", "Finance"];

function detectImportance(title, content, category) {
  const text = `${title || ""} ${content || ""}`.toLowerCase();

  if (BREAKING_KEYWORDS.some(k => text.includes(k))) return "breaking";
  if (HIGH_IMPORTANCE_KEYWORDS.some(k => text.includes(k))) return "high";
  if (HIGH_ENGAGEMENT_CATEGORIES.includes(category)) return "high";
  return "medium";
}

function shouldTriggerEmailAlert(importance, category) {
  return importance === "breaking" ||
    (importance === "high" && HIGH_ENGAGEMENT_CATEGORIES.includes(category));
}

// ── mapNewsdataArticle ────────────────────────────────────────────────────────
function mapNewsdataArticle(article, categoryOverride) {
  const category =
    categoryOverride || mapCategory(article.category?.[0] || "top");
  return {
    title: article.title || "",
    content: article.content || article.description || article.title || "",
    summary: article.description || article.title || "",
    url: article.link || "",
    source: article.source_name || "Unknown",
    author: Array.isArray(article.creator)
      ? article.creator[0]
      : article.creator || "",
    publishedAt: article.pubDate || new Date().toISOString(),
    category,
    imageUrl: article.image_url || "",
    externalId: article.link || "",
    language: article.language || "en",
  };
}

// Map Newsdata.io category names to our app category names
function mapCategory(category) {
  const map = {
    top: "Top Headlines",
    technology: "Technology",
    business: "Finance",
    finance: "Finance",
    politics: "Politics",
    education: "Education",
    entertainment: "Entertainment",
    health: "Health",
    science: "Science",
    fashion: "Fashion",
    fasion: "Fashion",
    sports: "Sports",
    world: "World",
    general: "Top Headlines",
  };
  return map[(category || "").toLowerCase()] || "Top Headlines";
}

// ── Language code mapper ──────────────────────────────────────────────────────
// Maps user.language (stored as full word in DB) → newsdata.io language code
export function mapLanguageCode(lang) {
  const map = { English: "en", Hindi: "hi", Marathi: "mr" };
  return map[lang] || "en";
}

export const fetchAllCategories = async () => {
  const categoriesToFetch = [
    "top",
    "technology",
    "business",
    "sports",
    "fashion",
    "health",
    "science",
    "entertainment",
    "politics",
    "education",
    "world",
  ];

  try {
    const requests = categoriesToFetch.map((cat) =>
      axios
        .get(
          `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&country=in&category=${cat}&language=en`,
        )
        .then((res) =>
          (res.data.results || []).map((a) =>
            mapNewsdataArticle(a, mapCategory(cat)),
          ),
        )
        .catch((err) => {
          console.error(`Error fetching ${cat}:`, err.message);
          return [];
        }),
    );

    const results = await Promise.all(requests);
    return results.flat();
  } catch (error) {
    console.error("Critical Fetch Error:", error.message);
    return [];
  }
};

// ✅ FETCH NEWS FROM NEWSDATA.IO
export const fetchNews = async (
  category = "top",
  country = "in",
  pageSize = 10,
  language = "en",   // ← now accepts user language code
) => {
  try {
    const cat = category === "general" ? "top" : category;
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&country=${country}&category=${cat}&language=${language}`;
    const response = await axios.get(url);
    const articles = response.data.results || [];

    return articles
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((a) => mapNewsdataArticle(a, mapCategory(cat)));
  } catch (error) {
    console.error("News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH GLOBAL NEWS
export const fetchGlobalNews = async () => {
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&language=en&category=top`;
    const response = await axios.get(url);
    return (response.data.results || []).map((a) => mapNewsdataArticle(a));
  } catch (error) {
    console.error("Global News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH INDIA NEWS
export const fetchIndiaNews = async () => {
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&country=in&language=en`;
    const response = await axios.get(url);
    return (response.data.results || []).map((a) => mapNewsdataArticle(a));
  } catch (error) {
    console.error("India News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH TRENDING NEWS
export const fetchTrendingNews = async () => {
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&language=en&category=top&country=in,us`;
    const response = await axios.get(url);
    return (response.data.results || []).map((a) => mapNewsdataArticle(a));
  } catch (error) {
    console.error("Trending News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH CATEGORY-WISE NEWS
export const fetchCategoryNews = async (category) => {
  try {
    const cat = category === "general" ? "top" : category;
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&country=in&language=en&category=${cat}`;
    const response = await axios.get(url);
    return (response.data.results || [])
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((a) => mapNewsdataArticle(a, mapCategory(cat)));
  } catch (error) {
    console.error("Category News Error:", error.message);
    return [];
  }
};

// ✅ SAVE NEWS TO DATABASE
export const saveNewsToDatabase = async (articles) => {
  try {
    const savedNews = [];
    const bulkOperations = [];

    for (const article of articles) {
      if (!article.title || !article.url || article.title === "[Removed]") {
        continue;
      }

      const content =
        article.content ||
        article.summary ||
        article.description ||
        article.title;
      const sentiment = detectSentiment(article.title, content);

      const newsData = {
        ...article,
        content,
        summary: article.summary || article.description || "",
        publishedAt: new Date(article.publishedAt || Date.now()),
        readTime: Math.ceil(content.length / 1000) || 3,
        trending: false,
        importance: "medium",
        sentiment,
      };

      bulkOperations.push({
        updateOne: {
          filter: { url: article.url },
          update: newsData,
          upsert: true,
        },
      });
    }

    if (bulkOperations.length > 0) {
      const result = await News.bulkWrite(bulkOperations, { ordered: false });
      console.log(
        `✅ Processed ${bulkOperations.length} articles | New: ${result.upsertedCount} | Updated: ${result.modifiedCount}`,
      );

      // Return newly inserted articles
      if (result.upsertedCount > 0) {
        const newIds = Object.values(result.upsertedIds || {});
        const newArticles = await News.find({ _id: { $in: newIds } });
        savedNews.push(...newArticles);
      }
    }

    return savedNews;
  } catch (error) {
    console.error("Error saving news to database:", error.message);
    return [];
  }
};

// ✅ ADDED: Real-time email alert when breaking/high-importance article is saved
// Finds all users with emailAlerts ON and sends bulk email — fire-and-forget
async function triggerRealTimeEmailAlerts(articles) {
  try {
    // Only process the first/most important article to avoid flooding
    const article = articles[0];
    if (!article) return;

    // Find users who want email alerts
    const users = await User.find({
      "notificationPreferences.emailAlerts": true,
      isActive: true,
      $or: [{ isVerified: true }, { isVerified: { $exists: false } }],
    }).select("email notificationPreferences interests");

    // Filter: breaking → all email-alert users; high → only interested users
    const targetUsers = article.importance === "breaking"
      ? users.filter(u => u.notificationPreferences?.breakingNews !== false)
      : users.filter(u =>
          u.notificationPreferences?.personalizedAlerts !== false &&
          (!u.interests?.length || u.interests.includes(article.category))
        );

    if (!targetUsers.length) return;

    const emails = targetUsers.map(u => u.email);
    const label = article.importance === "breaking" ? "🚨 Breaking News" : `📰 ${article.category}`;

    console.log(`📧 Real-time email alert → ${emails.length} users for: "${article.title}"`);

    await sendBulkNewsAlert(emails, {
      title: article.title,
      description: article.summary || article.content?.substring(0, 200) || "",
      link: article.url,
      category: label,
    });
  } catch (err) {
    console.warn("triggerRealTimeEmailAlerts error:", err.message);
  }
}

// ✅ GET LOCAL NEWS BASED ON USER LOCATION
export const getLocalNews = async (city, state) => {
  try {
    let query = "India";
    if (city) query += ` ${city}`;
    if (state) query += ` ${state}`;
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&q=${encodeURIComponent(query)}&country=in&language=en`;
    const response = await axios.get(url);
    return (response.data.results || [])
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((article) => ({
        title: article.title,
        content: article.content || article.description || article.title,
        summary: article.description || "",
        url: article.link || "",
        source: article.source_name || "Unknown",
        author: Array.isArray(article.creator)
          ? article.creator[0]
          : article.creator || "",
        publishedAt: article.pubDate || new Date().toISOString(),
        imageUrl: article.image_url || "",
        category: "Local",
        location: { city, state, country: "India" },
      }));
  } catch (error) {
    console.error("Local News Error:", error.message);
    return [];
  }
};
