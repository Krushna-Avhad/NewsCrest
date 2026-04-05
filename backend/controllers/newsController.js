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
    console.error("Gemini Logic Error:", error.message);
    
    // Determine if we should even bother searching the DB
    const simpleGreetings = ['hi', 'hello', 'who are you', 'what is this'];
    const isGreeting = simpleGreetings.some(g => query.toLowerCase().includes(g));

    return { 
      isNewsQuery: !isGreeting, // If it's a greeting, don't search news
      keywords: query, 
      text: isGreeting 
        ? "I am NewsCrest AI! I can help you find the latest news. What are you interested in today?" 
        : "I'm having a bit of trouble reaching my AI brain, but let me check the archives for " + query + "..." 
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
      query.category = { $in: user.interests };
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

    // Prefer articles marked trending; fall back to most recent
    let news = await News.find({ trending: true })
      .sort({ publishedAt: -1, 'engagement.shares': -1 })
      .limit(limit);

    if (news.length === 0) {
      news = await News.find().sort({ publishedAt: -1 }).limit(limit);
    }

    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET CATEGORY NEWS
export const getCategoryNews = async (req, res) => {
  try {
    let { category } = req.params;
    
    // 1. Formatting: 'finance' -> 'Finance'
    const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

    // 2. Robust Pagination (From your previous version)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 3. Flexible Query (Merged search terms)
    let searchTerms = [category, formattedCategory];
    if (formattedCategory === "Finance") searchTerms.push("Business", "business");
    if (formattedCategory === "India") searchTerms.push("india", "India News");
    if (formattedCategory === "Fashion") searchTerms.push("fasion", "fashion", "Lifestyle");
    if (formattedCategory === "Top" || category === "headlines") searchTerms.push("Top Headlines");

    const query = { category: { $in: searchTerms } };

    // 4. Database Fetch
    let news = await News.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    // 5. Special Fallback for India (If specific India tag is empty)
    if (news.length === 0 && formattedCategory === "India") {
      news = await News.find().sort({ publishedAt: -1 }).limit(limit);
    }

    const total = await News.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // 6. Detailed Response
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
    
    // 1. Get AI Analysis
    const aiResponse = await processWithGemini(query); 

    let articles = [];
    
    // 2. ONLY search DB if Gemini says it's a news-related question
    if (aiResponse.isNewsQuery === true) {
  // Split keywords into an array: "USA Iran War" -> ["USA", "Iran", "War"]
  const keywordArray = aiResponse.keywords.split(' ').filter(k => k.length > 2);

  articles = await News.find({
    $or: [
      // 1. Try to find the specific keywords in Title or Description
      { title: { $regex: aiResponse.keywords, $options: "i" } },
      { description: { $regex: aiResponse.keywords, $options: "i" } },
      // 2. OR match any of the individual words (makes search much broader)
      { title: { $in: keywordArray.map(k => new RegExp(k, 'i')) } }
    ]
  }).sort({ publishedAt: -1 }).limit(3);

  // 3. ONLY fallback to latest news if the AI actually wanted news 
  // AND we found absolutely nothing.
  if (articles.length === 0) {
    console.log("No specific matches for:", aiResponse.keywords);
    // Optional: Return the latest news but add a message that no specific match was found
    articles = await News.find().sort({ publishedAt: -1 }).limit(3);
  }
}
    // if (aiResponse.isNewsQuery === true) {
    //   articles = await News.find({
    //     $or: [
    //       { title: { $regex: aiResponse.keywords, $options: "i" } },
    //       { category: { $regex: aiResponse.keywords, $options: "i" } }
    //     ]
    //   }).sort({ publishedAt: -1 }).limit(3);

    //   // 3. Optional: If a news query found 0 results, then show latest news
    //   if (articles.length === 0) {
    //     articles = await News.find().sort({ publishedAt: -1 }).limit(3);
    //   }
    // } 
    // 💡 Logic: If isNewsQuery is false (like for "Who are you?"), 
    // articles remains an empty array [].

    res.json({
      reply: articles.length > 0 && aiResponse.keywords && !articles.some(a => a.title.toLowerCase().includes(aiResponse.keywords.toLowerCase().split(' ')[0])) 
             ? `${aiResponse.text} (I couldn't find specific updates on "${aiResponse.keywords}", but here is the latest news:)`
             : aiResponse.text,
      articles: articles 
    });

  } catch (error) {
    console.error("💥 Chatbot Controller Error:", error);
    res.status(200).json({ 
      reply: "I'm having a bit of trouble with my AI brain. How else can I help?", 
      articles: [] 
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