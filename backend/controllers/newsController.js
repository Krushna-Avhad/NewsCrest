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

    // 2. Fetch news - Attempt to get from Database first (Pro Tip implementation)
    // We fetch the latest 100 articles to have a good variety to filter from
    let news = await News.find().sort({ publishedAt: -1 }).limit(100);

    // 3. Fallback: If Database is empty, fetch from API directly
    if (!news || news.length === 0) {
      console.log("DB empty, fetching from API...");
      news = await fetchAllCategories(); 
      // Optional: Save these to DB so next time it's faster
      await saveNewsToDatabase(news);
    }

    if (!news || news.length === 0) {
      return res.status(404).json({ error: "No news found at the moment" });
    }

    // 4. Filter news based on user interests
    const filtered = filterNewsAdvanced(news, user);

    // 5. If no interest match, fallback to the general pool
    const newsToProcess = filtered.length > 0 ? filtered : news;

    // 6. Limit to avoid Gemini/AI API overload (Max 10 summaries)
    const limitedNews = newsToProcess.slice(0, 10);

    // 7. Summarize using AI (Gemini)
    const summarized = await Promise.all(
      limitedNews.map(async (item) => {
        // Use content, or description, or title as the source for AI
        const text = item.content || item.description || item.summary || item.title;

        try {
          const summary = await summarizeNews(text);

          // We return the EXACT structure your previous version used
          // so your Frontend (React/Flutter) works without changes
          return {
            title: item.title,
            summary: summary,
            source: item.source?.name || item.source, // Handles both API and DB shapes
            url: item.url,
            image: item.imageUrl || item.urlToImage, // Handles both field name variations
            publishedAt: item.publishedAt,
            category: item.category // Added category for better UI display
          };
        } catch (aiErr) {
          // If Gemini fails for one article, don't crash the whole feed
          return {
            title: item.title,
            summary: item.description || item.summary || "Click to read more...",
            source: item.source?.name || item.source,
            url: item.url,
            image: item.imageUrl || item.urlToImage,
            publishedAt: item.publishedAt,
            category: item.category
          };
        }
      })
    );

    // 8. Send final response
    res.json(summarized);

  } catch (err) {
    console.error("Feed Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET ALL NEWS (PAGINATED)
export const getAllNews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
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
    if (user.city || user.state) {
      const locationOr = [];
      if (user.city) locationOr.push({ 'location.city': user.city });
      if (user.state) locationOr.push({ 'location.state': user.state });
      if (locationOr.length > 0) query.$or = locationOr;
    }

    // Profile-based filtering
    const profileCategories = getProfileCategories(user.profileType);
    if (profileCategories.length > 0) {
      query.category = query.category || { $in: [] };
      if (Array.isArray(query.category.$in)) {
        query.category.$in = [...new Set([...query.category.$in, ...profileCategories])];
      }
    }

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

// ✅ GET TRENDING NEWS
export const getTrendingNews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;

    // Get most viewed + most saved articles from last 7 days as "trending"
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let news = await News.find({
      publishedAt: { $gte: sevenDaysAgo }
    })
      .sort({ viewCount: -1, 'engagement.saves': -1, publishedAt: -1 })
      .limit(limit);

    // Fallback — if less than 5 recent articles, just get most viewed overall
    if (news.length < 5) {
      news = await News.find()
        .sort({ viewCount: -1, 'engagement.saves': -1, publishedAt: -1 })
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
      { title: new RegExp(city, 'i') },
      { content: new RegExp(city, 'i') }
    );
    if (state) locationOr.push(
      { title: new RegExp(state, 'i') },
      { content: new RegExp(state, 'i') }
    );
    localQuery = { $or: locationOr };
  } else {
    localQuery = { category: { $in: ["India", "Top Headlines"] } };
  }

  let news = await News.find(localQuery)
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit);

  if (news.length === 0) {
    news = await News.find().sort({ publishedAt: -1 }).skip(skip).limit(limit);
  }

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

    let news = await News.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    if (news.length === 0) {
      news = await News.find().sort({ publishedAt: -1 }).skip(skip).limit(limit);
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

    const city = user.city || "India";
    
    // Regex search for city name in title or content
    const query = {
      $or: [
        { title: new RegExp(city, 'i') },
        { content: new RegExp(city, 'i') }
      ]
    };

    let news = await News.find(query).sort({ publishedAt: -1 }).limit(20);

    // Fallback to recent news if no city-specific matches
    if (news.length === 0) {
      news = await News.find().sort({ publishedAt: -1 }).limit(10);
    }

    res.json({ 
      news, 
      location: { city: user.city, state: user.state },
      message: news.length > 0 ? `News for ${city}` : "Showing general news"
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

    // 1. Get AI analysis
    const aiResponse = await processWithGemini(query);

    let articles = [];

    // 2. Only search DB if Gemini says it's a news-related question
    if (aiResponse.isNewsQuery === true) {
      const searchTerms = aiResponse.keywords
        .toLowerCase()
        .split(' ')
        .filter(word => word.length > 2);

      // Strict match first: must mention at least two keywords
      articles = await News.find({
        $and: [
          { title: { $regex: searchTerms[0] || '', $options: 'i' } },
          {
            $or: [
              { title:       { $regex: searchTerms[1] || searchTerms[0], $options: 'i' } },
              { description: { $regex: searchTerms[1] || searchTerms[0], $options: 'i' } },
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
            { title:       { $in: searchTerms.map(t => new RegExp(t, 'i')) } },
            { description: { $in: searchTerms.map(t => new RegExp(t, 'i')) } },
          ],
        })
          .sort({ publishedAt: -1 })
          .limit(3);
      } // ← Bug 2 fix: close the fallback if
    }   // ← Bug 1 fix: close the isNewsQuery if

    // Bug 3 fix: res.json is always reached, regardless of which branch ran
    res.json({
      reply: aiResponse.text,
      articles,
    });

  } catch (error) { // ← Bug 4 fix: try now has its closing } before catch
    console.error('💥 Chatbot Controller Error:', error);
    res.status(200).json({
      reply: "I'm having a bit of trouble with my AI brain. How else can I help?",
      articles: [],
    });
  }
};

// export const getChatbotResponse = async (req, res) => {
//   try {
//     const { query } = req.body;
//     const aiResponse = await processWithGemini(query); 

//     let articles = [];
    
//     // ONLY search the database if the AI confirms it's a news-related query
//     if (aiResponse.isNewsQuery) {
//       articles = await News.find({
//         $or: [
//           { title: { $regex: aiResponse.keywords, $options: "i" } },
//           { category: { $regex: aiResponse.keywords, $options: "i" } }
//         ]
//       }).sort({ publishedAt: -1 }).limit(3);

//       // If no specific match, get latest 3 as a helpful backup
//       if (articles.length === 0) {
//         articles = await News.find().sort({ publishedAt: -1 }).limit(3);
//       }
//     }

//     res.json({
//       reply: aiResponse.text,
//       articles: articles // This will be [] if it's just a greeting like "Who are you?"
//     });

//   } catch (error) {
//     console.error("💥 Chatbot Controller Error:", error);
//     res.status(200).json({ 
//       reply: "I'm having a bit of trouble with my AI brain. How else can I help?", 
//       articles: [] 
//     });
//   }
// };