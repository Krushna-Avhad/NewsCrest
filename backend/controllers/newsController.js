// controllers/newsController.js
import {
  fetchAllCategories,
  fetchNews,
  saveNewsToDatabase,
} from "../services/newsService.js";
import { summarizeNews, filterNewsAdvanced } from "../services/aiService.js";
import { processChatbotQuery } from "../services/aiService.js";
import User from "../models/User.js";
import News from "../models/News.js";
import Groq from "groq-sdk";
import {
  recordUserActivity,
  processArticleIntoTimeline,
} from "../services/storyTimelineService.js";

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GROK_API_KEY });

// Chat helper using Groq
async function processWithGroq(query) {
  try {
    const prompt = `You are NewsCrest AI. 
- If the user is GREETING you or asking WHO YOU ARE, set "isNewsQuery": false.
- If the user is asking for NEWS or specific TOPICS, set "isNewsQuery": true.

User message: "${query}"

Respond ONLY in JSON:
{
"isNewsQuery": boolean,
"keywords": "search terms",
"text": "your response"
}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });

    const raw = response.choices[0]?.message?.content?.trim() || "";
    if (!raw) throw new Error("Empty AI response");
    const cleanedJson = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedJson);
  } catch (error) {
    const greetings = ["hi", "hello", "who are you", "what is this"];
    const isGreeting = greetings.some((g) => query.toLowerCase().includes(g));
    return {
      isNewsQuery: !isGreeting,
      keywords: query,
      text: isGreeting
        ? "I am NewsCrest AI! I can help you find the latest news. What are you interested in today?"
        : `I'm checking our archives for "${query}"...`,
    };
  }
}

export const getMyFeed = async (req, res) => {
  try {
    // 1. Get logged-in user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Fetch a large pool from DB — raised from 100 to 500
    let news = await News.find().sort({ publishedAt: -1 }).limit(500);

    // 3. Fallback: If Database is empty, fetch from external API
    if (!news || news.length === 0) {
      console.log("DB empty, fetching from API...");
      news = await fetchAllCategories();
      await saveNewsToDatabase(news);
    }

    if (!news || news.length === 0) {
      return res.status(404).json({ error: "No news found at the moment" });
    }

    // 4. Filter by user interests from the full 500 pool
    const filtered = filterNewsAdvanced(news, user);
    const newsToProcess = filtered.length > 0 ? filtered : news;

    // 5. AI summarization limited to 10 — sequential to avoid Groq 429
    const limitedForAI = newsToProcess.slice(0, 10);
    const summarized = [];

    for (const item of limitedForAI) {
      const text =
        item.content || item.description || item.summary || item.title;
      try {
        // Pass item._id so aiService can cache & skip re-summarizing
        const summary = await summarizeNews(text, item._id);
        summarized.push({
          _id: item._id,
          title: item.title,
          summary,
          source: item.source?.name || item.source,
          url: item.url,
          imageUrl: item.imageUrl || item.urlToImage,
          publishedAt: item.publishedAt,
          category: item.category,
          sentiment: item.sentiment,
          trending: item.trending,
          tags: item.tags,
        });
      } catch {
        summarized.push({
          _id: item._id,
          title: item.title,
          summary: item.description || item.summary || "Click to read more...",
          source: item.source?.name || item.source,
          url: item.url,
          imageUrl: item.imageUrl || item.urlToImage,
          publishedAt: item.publishedAt,
          category: item.category,
          sentiment: item.sentiment,
          trending: item.trending,
          tags: item.tags,
        });
      }
    }

    // 6. ✅ Return { news } shape — fixes api.js reading data.news as undefined
    res.json({ news: summarized });
  } catch (err) {
    console.error("Feed Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET ALL NEWS (PAGINATED)
export const getAllNews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // ✅ raised from 20 → 50
    const category = req.query.category;
    const skip = (page - 1) * limit;

    let query = {};
    if (category) {
      query.category = category;
    }

    const news = await News.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await News.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      news,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET PERSONALIZED NEWS FEED
export const getPersonalizedFeed = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build personalized query based on user profile
    let query = {};

    // If user has interests, prioritize those categories
    if (user.interests && user.interests.length > 0) {
      // Map interest tags to actual DB category names
      const interestToCategoryMap = {
        AI: "Technology",
        Startups: "Business",
        Tech: "Technology",
        Finance: "Finance",
        Sports: "Sports",
        Science: "Science",
        Business: "Business",
        Health: "Health",
        Entertainment: "Entertainment",
        Politics: "Politics",
        Education: "Education",
        Technology: "Technology",
      };
      const mappedCategories = [
        ...new Set(user.interests.map((i) => interestToCategoryMap[i] || i)),
      ];
      query.category = { $in: mappedCategories };
    }

    // Add location-based news (guard against empty $or which causes MongoDB error)
    // if (user.city || user.state) {
    //   const locationOr = [];
    //   if (user.city) locationOr.push({ 'location.city': user.city });
    //   if (user.state) locationOr.push({ 'location.state': user.state });
    //   if (locationOr.length > 0) query.$or = locationOr;
    // }

    // Only add profile categories if user has NO interests set
    // if (!user.interests || user.interests.length === 0) {
    //   const profileCategories = getProfileCategories(user.profileType);
    //   if (profileCategories.length > 0) {
    //     query.category = { $in: profileCategories };
    //   }
    // }

    const news = await News.find(query)
      .sort({ publishedAt: -1, trending: -1 })
      .skip(skip)
      .limit(limit);

    const total = await News.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      news,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      personalizationInfo: {
        interests: user.interests,
        profileType: user.profileType,
        location: { city: user.city, state: user.state },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET TOP HEADLINES
export const getTopHeadlines = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Try Top Headlines category first; fall back to any recent articles
    let news = await News.find({ category: "Top Headlines" })
      .sort({ publishedAt: -1 })
      .limit(limit);

    if (news.length === 0) {
      news = await News.find().sort({ publishedAt: -1 }).limit(limit);
    }

    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET TRENDING NEWS
export const getTrendingNews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;

    // Get most viewed + most saved articles from last 7 days as "trending"
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let news = await News.find({
      publishedAt: { $gte: sevenDaysAgo },
    })
      .sort({ viewCount: -1, "engagement.saves": -1, publishedAt: -1 })
      .limit(limit);

    // Fallback — if less than 5 recent articles, just get most viewed overall
    if (news.length < 5) {
      news = await News.find()
        .sort({ viewCount: -1, "engagement.saves": -1, publishedAt: -1 })
        .limit(limit);
    }

    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET CATEGORY NEWS
export const getCategoryNews = async (req, res) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const categoryAliasMap = {
      "good news": [
        "Good News",
        "Health",
        "Science",
        "Education",
        "Entertainment",
      ],
      goodnews: [
        "Good News",
        "Health",
        "Science",
        "Education",
        "Entertainment",
      ],
      local: ["Local", "India", "Top Headlines"],
      india: ["India", "Top Headlines", "Politics", "World"],
      fashion: ["Fashion", "Entertainment"],
      finance: ["Finance", "Business"],
      business: ["Business", "Finance"],
      "top headlines": ["Top Headlines"],
      technology: ["Technology"],
      sports: ["Sports"],
      health: ["Health"],
      science: ["Science"],
      entertainment: ["Entertainment"],
      politics: ["Politics"],
      education: ["Education"],
      world: ["World"],
    };

    const key = category.toLowerCase().trim();

    // Local news — use user's city/state if logged in
    if (key === "local") {
      const city = req.user?.city;
      const state = req.user?.state;

      let localQuery;
      if (city || state) {
        const locationOr = [];
        if (city)
          locationOr.push(
            { title: new RegExp(`\\b${city}\\b`, "i") },
            { content: new RegExp(`\\b${city}\\b`, "i") },
          );
        if (state)
          locationOr.push(
            { title: new RegExp(`\\b${state}\\b`, "i") },
            { content: new RegExp(`\\b${state}\\b`, "i") },
          );
        localQuery = { $or: locationOr };
      } else {
        localQuery = { category: { $in: ["India", "Top Headlines"] } };
      }

      let news = await News.find(localQuery)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit);

      // NO random fallback — if no local news, return empty
      // Frontend will show "No local news found" message

      const total = await News.countDocuments(localQuery);
      const totalPages = Math.ceil(total / limit);

      return res.json({
        news,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    }

    const searchTerms = categoryAliasMap[key] || [
      category,
      category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
    ];

    const query = { category: { $in: searchTerms } };

    // ✅ Respect sortBy param from frontend tab selection
    const sortBy = req.query.sortBy || "date";
    const sortOptions =
      sortBy === "trending"
        ? { trending: -1, viewCount: -1, publishedAt: -1 }
        : { publishedAt: -1 };

    let news = await News.find(query).sort(sortOptions).skip(skip).limit(limit);

    if (news.length === 0) {
      news = await News.find().sort(sortOptions).skip(skip).limit(limit);
    }

    const total = await News.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      news,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Category Fetch Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ IMPROVED LOCAL NEWS HANDLER
export const getLocalNewsHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ news: [], message: "Please log in to see local news" });
    }

    const { city, state } = req.user;

    if (!city && !state) {
      return res.json({
        news: [],
        message: "Please set your city and state in your profile",
      });
    }

    // More flexible matching — match city or state in title, content, or summary
    const conditions = [];

    if (city) {
      const cityRegex = new RegExp(city, "i");
      conditions.push(
        { title: cityRegex },
        { content: cityRegex },
        { summary: cityRegex },
      );
    }

    if (state) {
      const stateRegex = new RegExp(state, "i");
      conditions.push(
        { title: stateRegex },
        { content: stateRegex },
        { summary: stateRegex },
      );
    }

    const news = await News.find(
      conditions.length > 0 ? { $or: conditions } : {},
    )
      .sort({ publishedAt: -1, importance: -1 })
      .limit(20);

    res.json({
      news,
      location: { city, state },
      message:
        news.length > 0
          ? `Local news near ${city || state}`
          : `No recent news found for ${city || state} at the moment`,
    });
  } catch (err) {
    console.error("Local News Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET GOOD NEWS
export const getGoodNewsHandler = async (req, res) => {
  try {
    const positiveWords = [
      "inspiring",
      "success",
      "breakthrough",
      "won",
      "happy",
      "helps",
      "recovery",
      "good",
    ];

    const query = {
      $or: [
        { title: { $in: positiveWords.map((w) => new RegExp(w, "i")) } },
        {
          category: {
            $in: ["Health", "Science", "Education", "Entertainment"],
          },
        },
      ],
    };

    const news = await News.find(query).sort({ publishedAt: -1 }).limit(20);

    res.json({ news });
  } catch (err) {
    console.error("Good News Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET SINGLE ARTICLE
export const getArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await News.findById(id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Increment view count
    article.viewCount += 1;
    await article.save();

    // Add to user's reading history if authenticated
    if (req.user) {
      try {
        const user = await User.findById(req.user.id);
        if (user) {
          user.readingHistory.push({
            articleId: article._id,
            readAt: new Date(),
            readTime: article.readTime,
          });
          await user.save();
          // Persist rich snapshot for timeline generation (non-blocking)
          recordUserActivity(req.user.id, "read", article).catch(() => {});
        }
      } catch (_) {} // non-critical, don't fail the request
    }

    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ SAVE ARTICLE (BOOKMARK)
export const saveArticle = async (req, res) => {
  try {
    const articleId = req.params.id || req.params.articleId;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user.savedArticles.includes(articleId)) {
      user.savedArticles.push(articleId);
      await user.save();
    }

    // Update article engagement
    await News.findByIdAndUpdate(articleId, {
      $inc: { "engagement.saves": 1 },
    });

    // Persist rich snapshot for timeline generation (non-blocking)
    const savedArticle = await News.findById(articleId);
    if (savedArticle) {
      recordUserActivity(userId, "saved", savedArticle).catch(() => {});
      // Add to story timeline so updates appear on the Story Timeline page
      processArticleIntoTimeline(savedArticle).catch(() => {});
    }

    res.json({ message: "Article saved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ UNSAVE ARTICLE
export const unsaveArticle = async (req, res) => {
  try {
    const articleId = req.params.id || req.params.articleId;
    const userId = req.user.id;

    await User.findByIdAndUpdate(userId, {
      $pull: { savedArticles: articleId },
    });

    // Update article engagement
    await News.findByIdAndUpdate(articleId, {
      $inc: { "engagement.saves": -1 },
    });

    res.json({ message: "Article removed from saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET SAVED ARTICLES
export const getSavedArticles = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).populate({
      path: "savedArticles",
      options: { sort: { createdAt: -1 }, skip, limit },
    });

    const total = user.savedArticles.length;
    const totalPages = Math.ceil(total / limit);

    res.json({
      articles: user.savedArticles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ REFRESH NEWS (FETCH FROM EXTERNAL APIs)
export const refreshNews = async (req, res) => {
  try {
    const { category = "general" } = req.query;

    // Fetch from external API
    const articles = await fetchNews(category);

    // Save to database
    const savedNews = await saveNewsToDatabase(articles);

    res.json({
      message: "News refreshed successfully",
      newArticlesCount: savedNews.length,
      articles: savedNews,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET ARTICLE COUNT PER CATEGORY (for CategoriesPage grid)
export const getCategoryCounts = async (req, res) => {
  try {
    const counts = await News.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    // Return as a flat map: { Technology: 412, Sports: 339, ... }
    const countMap = {};
    counts.forEach(({ _id, count }) => {
      if (_id) countMap[_id] = count;
    });
    res.json({ counts: countMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ HELPER FUNCTION: GET CATEGORIES BASED ON PROFILE TYPE
function getProfileCategories(profileType) {
  const profileMap = {
    Student: ["Education", "Technology", "Science", "Career", "Good News"],
    "IT Employee": ["Technology", "Business", "Finance", "Science", "World"],
    Elderly: ["Health", "Good News", "Politics", "Education", "Local"],
    "Business Person": [
      "Business",
      "Finance",
      "Politics",
      "Technology",
      "World",
    ],
    Homemaker: ["Health", "Education", "Good News", "Local", "Fashion"],
    "General Reader": [
      "Top Headlines",
      "World",
      "India",
      "Technology",
      "Health",
    ],
  };

  return profileMap[profileType] || profileMap["General Reader"];
}

// ✅ The Chatbot Handler
// newsController.js

// backend/controllers/newsController.js

export const getChatbotResponse = async (req, res) => {
  try {
    const { query } = req.body;

    // 1. Get AI analysis
    const aiResponse = await processWithGroq(query);

    let articles = [];

    // 2. Only search DB if Groq says it's a news-related question
    if (aiResponse.isNewsQuery === true) {
      const searchTerms = aiResponse.keywords
        .toLowerCase()
        .split(" ")
        .filter((word) => word.length > 2);

      // Strict match first: must mention at least two keywords
      articles = await News.find({
        $and: [
          { title: { $regex: searchTerms[0] || "", $options: "i" } },
          {
            $or: [
              {
                title: {
                  $regex: searchTerms[1] || searchTerms[0],
                  $options: "i",
                },
              },
              {
                description: {
                  $regex: searchTerms[1] || searchTerms[0],
                  $options: "i",
                },
              },
            ],
          },
        ],
      })
        .sort({ publishedAt: -1 })
        .limit(3);

      // Broad fallback if strict match returns nothing
      if (articles.length === 0) {
        articles = await News.find({
          $or: [
            { title: { $in: searchTerms.map((t) => new RegExp(t, "i")) } },
            {
              description: { $in: searchTerms.map((t) => new RegExp(t, "i")) },
            },
          ],
        })
          .sort({ publishedAt: -1 })
          .limit(3);
      } // ← Bug 2 fix: close the fallback if
    } // ← Bug 1 fix: close the isNewsQuery if

    // Bug 3 fix: res.json is always reached, regardless of which branch ran
    res.json({
      reply: aiResponse.text,
      articles,
    });
  } catch (error) {
    // ← Bug 4 fix: try now has its closing } before catch
    console.error("💥 Chatbot Controller Error:", error);
    res.status(200).json({
      reply:
        "I'm having a bit of trouble with my AI brain. How else can I help?",
      articles: [],
    });
  }
};