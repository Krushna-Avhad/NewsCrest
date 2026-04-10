// controllers/newsController.js
import { fetchAllCategories, fetchNews, saveNewsToDatabase } from "../services/newsService.js";
import { summarizeNews, filterNewsAdvanced } from "../services/aiService.js";
import { processChatbotQuery } from "../services/aiService.js";
import User from "../models/User.js";
import News from "../models/News.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { recordUserActivity } from "../services/storyTimelineService.js";

// 1. INITIALIZE Gemini (Do this at the TOP)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 2. HELPER FUNCTION (Define this before the controller uses it)
async function processWithGemini(query) {
  try {
    // Try the standard model name first
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are NewsCrest AI. 
      - If the user is GREETING you or asking WHO YOU ARE, set "isNewsQuery": false.
      - If the user is asking for NEWS or specific TOPICS, set "isNewsQuery": true.
  
      User message: "${query}"
  
      Respond ONLY in JSON:
      {
      "isNewsQuery": boolean,
      "keywords": "search terms",
      "text": "your response"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Safety check for empty or malformed AI response
    if (!responseText) throw new Error("Empty AI response");

    const cleanedJson = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedJson);
  } catch (error) {
    // 429 Quota or 404 Error Fallback
    const greetings = ['hi', 'hello', 'who are you', 'what is this'];
    const isGreeting = greetings.some(g => query.toLowerCase().includes(g));
    

    return { 
      isNewsQuery: !isGreeting, // If it's a greeting, don't search news
      keywords: query, 
      text: isGreeting 
        ? "I am NewsCrest AI! I can help you find the latest news. What are you interested in today?" 
        : `I'm checking our archives for "${query}"...`
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
      const text = item.content || item.description || item.summary || item.title;
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
        hasPrev: page > 1
      }
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
        "AI": "Technology",
        "Startups": "Business",
        "Tech": "Technology",
        "Finance": "Finance",
        "Sports": "Sports",
        "Science": "Science",
        "Business": "Business",
        "Health": "Health",
        "Entertainment": "Entertainment",
        "Politics": "Politics",
        "Education": "Education",
        "Technology": "Technology",
      };
      const mappedCategories = [
        ...new Set(
          user.interests.map(i => interestToCategoryMap[i] || i)
        )
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
        hasPrev: page > 1
      },
      personalizationInfo: {
        interests: user.interests,
        profileType: user.profileType,
        location: { city: user.city, state: user.state }
      }
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
    let news = await News.find({ category: 'Top Headlines' })
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

// ✅ GET TRENDING NEWS (paginated)
export const getTrendingNews = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip  = (page - 1) * limit;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendingQuery = { publishedAt: { $gte: sevenDaysAgo } };

    let total = await News.countDocuments(trendingQuery);

    // If recent DB is too sparse, fall back to all-time trending
    const useFallback = total < 10;
    const finalQuery  = useFallback ? {} : trendingQuery;
    if (useFallback) total = await News.countDocuments({});

    const news = await News.find(finalQuery)
      .sort({ trending: -1, viewCount: -1, "engagement.saves": -1, publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.json({
      news,
      pagination: {
        page, limit, total, totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
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
      "good news":     ["Good News", "Health", "Science", "Education", "Entertainment"],
      "goodnews":      ["Good News", "Health", "Science", "Education", "Entertainment"],
      "local":         ["Local", "India", "Top Headlines"],
      "india":         ["India", "Top Headlines", "Politics", "World"],
      "fashion":       ["Fashion", "Entertainment"],
      "finance":       ["Finance", "Business"],
      "business":      ["Business", "Finance"],
      "top headlines": ["Top Headlines"],
      "technology":    ["Technology"],
      "sports":        ["Sports"],
      "health":        ["Health"],
      "science":       ["Science"],
      "entertainment": ["Entertainment"],
      "politics":      ["Politics"],
      "education":     ["Education"],
      "world":         ["World"],
    };

const key = category.toLowerCase().trim();

// Local news — use user's city/state if logged in
if (key === "local") {
  const city = req.user?.city;
  const state = req.user?.state;

  let localQuery;
  if (city || state) {
    const locationOr = [];
    if (city) locationOr.push(
      { title: new RegExp(`\\b${city}\\b`, 'i') },
      { content: new RegExp(`\\b${city}\\b`, 'i') }
    );
    if (state) locationOr.push(
      { title: new RegExp(`\\b${state}\\b`, 'i') },
      { content: new RegExp(`\\b${state}\\b`, 'i') }
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
    pagination: { page, limit, total, totalPages,
      hasNext: page < totalPages, hasPrev: page > 1 }
  });
}

const searchTerms = categoryAliasMap[key] || [
  category,
  category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
];

const query = { category: { $in: searchTerms } };;

    // ✅ Respect sortBy param from frontend tab selection
    const sortBy = req.query.sortBy || "date";
    const sortOptions =
      sortBy === "trending"
        ? { trending: -1, viewCount: -1, publishedAt: -1 }
        : { publishedAt: -1 };

    let news = await News.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    if (news.length === 0) {
      news = await News.find().sort(sortOptions).skip(skip).limit(limit);
    }

    const total = await News.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      news,
      pagination: {
        page, limit, total, totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error("Category Fetch Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET LOCAL NEWS
export const getLocalNewsHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const city = user.city;
    const state = user.state;

    if (!city && !state) {
      // User hasn't set location — return empty so frontend hides Local section
      return res.json({ news: [], location: {}, message: "No location set" });
    }

    // Build strict location query — must match city OR state in title/content
    const orConditions = [];
    if (city) {
      orConditions.push(
        { title: new RegExp(`\\b${city}\\b`, 'i') },
        { content: new RegExp(`\\b${city}\\b`, 'i') }
      );
    }
    if (state) {
      orConditions.push(
        { title: new RegExp(`\\b${state}\\b`, 'i') },
        { content: new RegExp(`\\b${state}\\b`, 'i') }
      );
    }

    const news = await News.find({ $or: orConditions })
      .sort({ publishedAt: -1 })
      .limit(20);

    res.json({ 
      news,
      location: { city, state },
      message: news.length > 0 
        ? `News for ${[city, state].filter(Boolean).join(", ")}` 
        : "No local news found for your area"
    });
  } catch (err) {
    console.error("Local News Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET GOOD NEWS
export const getGoodNewsHandler = async (req, res) => {
  try {
    const positiveWords = ["inspiring", "success", "breakthrough", "won", "happy", "helps", "recovery", "good"];
    
    const query = {
      $or: [
        { title: { $in: positiveWords.map(w => new RegExp(w, 'i')) } },
        { category: { $in: ["Health", "Science", "Education", "Entertainment"] } }
      ]
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
            readTime: article.readTime
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
      $inc: { 'engagement.saves': 1 }
    });

    // Persist rich snapshot for timeline generation (non-blocking)
    const savedArticle = await News.findById(articleId);
    if (savedArticle) recordUserActivity(userId, "saved", savedArticle).catch(() => {});

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
      $pull: { savedArticles: articleId }
    });

    // Update article engagement
    await News.findByIdAndUpdate(articleId, {
      $inc: { 'engagement.saves': -1 }
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

    const user = await User.findById(userId)
      .populate({
        path: 'savedArticles',
        options: { sort: { createdAt: -1 }, skip, limit }
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
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ REFRESH NEWS (FETCH FROM EXTERNAL APIs)
export const refreshNews = async (req, res) => {
  try {
    const { category = 'general' } = req.query;
    
    // Fetch from external API
    const articles = await fetchNews(category);
    
    // Save to database
    const savedNews = await saveNewsToDatabase(articles);
    
    res.json({ 
      message: "News refreshed successfully",
      newArticlesCount: savedNews.length,
      articles: savedNews
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
      { $sort: { count: -1 } }
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
    'Student': ['Education', 'Technology', 'Science', 'Career', 'Good News'],
    'IT Employee': ['Technology', 'Business', 'Finance', 'Science', 'World'],
    'Elderly': ['Health', 'Good News', 'Politics', 'Education', 'Local'],
    'Business Person': ['Business', 'Finance', 'Politics', 'Technology', 'World'],
    'Homemaker': ['Health', 'Education', 'Good News', 'Local', 'Fashion'],
    'General Reader': ['Top Headlines', 'World', 'India', 'Technology', 'Health']
  };
  
  return profileMap[profileType] || profileMap['General Reader'];
}

// ✅ The Chatbot Handler
// newsController.js

// backend/controllers/newsController.js

export const getChatbotResponse = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query?.trim()) {
      return res.json({ reply: "Please ask me something!", articles: [] });
    }

    const q = query.trim();
    const lc = q.toLowerCase();

    // ── 1. Detect greetings — respond immediately, no DB needed ──────────────
    const greetWords = ["hi", "hello", "hey", "who are you", "what are you", "what is newscrest"];
    const isGreeting = greetWords.some(g => lc.includes(g)) && lc.length < 40;
    if (isGreeting) {
      return res.json({
        reply: "Hi! I'm NewsCrest AI 👋 Ask me about any news topic — politics, sports, tech, or paste an article title and I'll tell you more about it.",
        articles: [],
      });
    }

    // ── 2. DB search — always run against real articles ───────────────────────
    // Strip filler phrases like "tell me more about:" / "explain:" so the
    // actual article title is used as the search string
    const cleanQuery = q
      .replace(/^(tell me more about|explain|summarise|summarize|what is|more on|about)[:\s]*/i, "")
      .trim();

    // Build search terms — every word over 3 chars becomes a regex term
    const words = cleanQuery
      .split(/\s+/)
      .filter(w => w.length > 3)
      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    // Try full-phrase match first (best for "Tell me more about: [title]")
    let articles = await News.find({
      $or: [
        { title:   { $regex: cleanQuery, $options: "i" } },
        { content: { $regex: cleanQuery, $options: "i" } },
        { summary: { $regex: cleanQuery, $options: "i" } },
        { tags:    { $in: [new RegExp(cleanQuery, "i")] } },
      ],
    })
      .sort({ publishedAt: -1 })
      .limit(5);

    // Fallback: OR across individual words
    if (articles.length === 0 && words.length > 0) {
      articles = await News.find({
        $or: [
          { title:    { $in: words.map(w => new RegExp(w, "i")) } },
          { content:  { $in: words.map(w => new RegExp(w, "i")) } },
          { tags:     { $in: words.map(w => new RegExp(w, "i")) } },
          { category: { $in: words.map(w => new RegExp(w, "i")) } },
        ],
      })
        .sort({ publishedAt: -1 })
        .limit(5);
    }

    // Last resort: newest 3 articles so the bot is never empty-handed
    if (articles.length === 0) {
      articles = await News.find().sort({ publishedAt: -1 }).limit(3);
    }

    // ── 3. Build context from real articles and ask Groq ─────────────────────
    const user = req.user;
    const city = user?.city || "your city";

    const articleContext = articles
      .map((a, i) =>
        `Article ${i + 1}:\nTitle: ${a.title}\nSource: ${a.source}\nSummary: ${a.summary || a.content?.substring(0, 200) || "No summary"}\nPublished: ${new Date(a.publishedAt).toDateString()}`
      )
      .join("\n\n");

    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY });

    const prompt = `You are NewsCrest AI, a smart news assistant for users in ${city}.

The user said: "${q}"

Here are REAL articles from our database that are relevant:

${articleContext}

Instructions:
- Answer ONLY based on the real articles above. Do NOT invent facts.
- If the user asked "tell me more about [title]", give a detailed explanation of that specific article.
- If the user asked a general topic (sports, politics etc.), summarise the key points from the articles.
- If asking for top headlines, list what you actually found above.
- Be conversational, clear and concise. Use bullet points where helpful.
- Never say "I found X articles" — just answer naturally.
- Keep response under 200 words.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
    });

    const reply = completion.choices[0]?.message?.content?.trim()
      || "Here's what I found in our database for you.";

    res.json({ reply, articles });

  } catch (error) {
    console.error("💥 Chatbot Error:", error.message);
    res.status(200).json({
      reply: "I'm having a bit of trouble right now. Please try again in a moment.",
      articles: [],
    });
  }
};