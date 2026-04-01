// controllers/newsController.js
import { fetchNews, saveNewsToDatabase } from "../services/newsService.js";
import { summarizeNews, filterNewsAdvanced } from "../services/aiService.js";
import User from "../models/User.js";
import News from "../models/News.js";

export const getMyFeed = async (req, res) => {
  try {
    // 1. Get logged-in user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Fetch news (from News API)
    const news = await fetchNews();

    if (!news || news.length === 0) {
      return res.status(404).json({ error: "No news found" });
    }

    // 3. Filter news based on user interests
    const filtered = filterNewsAdvanced(news, user);

    // 4. If no match, fallback to top news
    const newsToProcess = filtered.length > 0 ? filtered : news;

    // 5. Limit to avoid API overload (VERY IMPORTANT)
    const limitedNews = newsToProcess.slice(0, 10);

    // 6. Summarize using AI
    const summarized = await Promise.all(
      limitedNews.map(async (item) => {
        const text = item.content || item.description || item.title;

        const summary = await summarizeNews(text);

        return {
          title: item.title,
          summary,
          source: item.source?.name,
          url: item.url,
          image: item.urlToImage,
          publishedAt: item.publishedAt,
        };
      })
    );

    // 7. Send response
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

    // Add location-based news
    if (user.city || user.state) {
      query.$or = query.$or || [];
      if (user.city) {
        query.$or.push({ 'location.city': user.city });
      }
      if (user.state) {
        query.$or.push({ 'location.state': user.state });
      }
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
      .limit(limit)
      .populate('engagement');

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
    
    const news = await News.find({ 
      category: 'Top Headlines',
      importance: { $in: ['high', 'breaking'] }
    })
    .sort({ publishedAt: -1 })
    .limit(limit);

    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET TRENDING NEWS
export const getTrendingNews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    
    const news = await News.find({ trending: true })
      .sort({ publishedAt: -1, 'engagement.shares': -1 })
      .limit(limit);

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

    const news = await News.find({ category })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await News.countDocuments({ category });
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

// ✅ GET LOCAL NEWS
export const getLocalNewsHandler = async (req, res) => {
  try {
    const user = req.user;
    const limit = parseInt(req.query.limit) || 20;

    let query = { category: 'Local' };
    
    if (user.city || user.state) {
      query.$or = [];
      if (user.city) {
        query.$or.push({ 'location.city': user.city });
      }
      if (user.state) {
        query.$or.push({ 'location.state': user.state });
      }
    }

    const news = await News.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit);

    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET GOOD NEWS
export const getGoodNewsHandler = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const news = await News.find({ 
      category: 'Good News',
      sentiment: 'positive'
    })
    .sort({ publishedAt: -1 })
    .limit(limit);

    res.json({ news });
  } catch (err) {
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
      const user = await User.findById(req.user.id);
      user.readingHistory.push({
        articleId: article._id,
        readAt: new Date(),
        readTime: article.readTime
      });
      await user.save();
    }

    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ SAVE ARTICLE (BOOKMARK)
export const saveArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
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

    res.json({ message: "Article saved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ UNSAVE ARTICLE
export const unsaveArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
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