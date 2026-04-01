// controllers/searchController.js
import News from "../models/News.js";
import User from "../models/User.js";
import { searchNews } from "../services/aiService.js";

// ✅ SEARCH NEWS
export const searchNewsHandler = async (req, res) => {
  try {
    const { q, category, dateFrom, dateTo, source, sortBy = 'relevance' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Build search query
    let query = {
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { summary: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    };

    // Add filters
    if (category) {
      query.category = category;
    }

    if (source) {
      query.source = { $regex: source, $options: 'i' };
    }

    if (dateFrom || dateTo) {
      query.publishedAt = {};
      if (dateFrom) query.publishedAt.$gte = new Date(dateFrom);
      if (dateTo) query.publishedAt.$lte = new Date(dateTo);
    }

    // Add personalization if user is authenticated
    if (req.user && req.user.interests && req.user.interests.length > 0) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { category: { $in: req.user.interests } },
          { tags: { $in: req.user.interests } }
        ]
      });
    }

    // Sorting
    let sortOptions = {};
    switch (sortBy) {
      case 'date':
        sortOptions = { publishedAt: -1 };
        break;
      case 'popularity':
        sortOptions = { 'engagement.shares': -1, 'engagement.comments': -1 };
        break;
      case 'trending':
        sortOptions = { trending: -1, publishedAt: -1 };
        break;
      default: // relevance
        sortOptions = { publishedAt: -1 };
    }

    const news = await News.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const total = await News.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      news,
      query: q,
      filters: { category, dateFrom, dateTo, source, sortBy },
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

// ✅ GET TRENDING TOPICS
export const getTrendingTopics = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Get trending articles and extract common keywords/tags
    const trendingArticles = await News.find({ trending: true })
      .select('tags category')
      .limit(100);

    // Count frequency of tags
    const tagFrequency = {};
    trendingArticles.forEach(article => {
      if (article.tags) {
        article.tags.forEach(tag => {
          tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
        });
      }
    });

    // Get category frequency
    const categoryFrequency = {};
    trendingArticles.forEach(article => {
      categoryFrequency[article.category] = (categoryFrequency[article.category] || 0) + 1;
    });

    // Sort by frequency and limit
    const trendingTags = Object.entries(tagFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));

    const trendingCategories = Object.entries(categoryFrequency)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => ({ category, count }));

    res.json({
      trendingTags,
      trendingCategories
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ EXPLORE BY CATEGORY
export const exploreByCategory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    const { timeframe = 'week' } = req.query;

    // Calculate date range
    let dateRange = new Date();
    switch (timeframe) {
      case 'day':
        dateRange.setDate(dateRange.getDate() - 1);
        break;
      case 'week':
        dateRange.setDate(dateRange.getDate() - 7);
        break;
      case 'month':
        dateRange.setMonth(dateRange.getMonth() - 1);
        break;
      default:
        dateRange.setDate(dateRange.getDate() - 7);
    }

    // Get article count by category
    const categoryStats = await News.aggregate([
      {
        $match: {
          publishedAt: { $gte: dateRange }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgReadTime: { $avg: '$readTime' },
          totalViews: { $sum: '$viewCount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get latest articles for each category
    const categoriesWithArticles = await Promise.all(
      categoryStats.map(async (stat) => {
        const articles = await News.find({ 
          category: stat._id,
          publishedAt: { $gte: dateRange }
        })
        .sort({ publishedAt: -1, trending: -1 })
        .limit(limit);

        return {
          category: stat._id,
          stats: {
            count: stat.count,
            avgReadTime: Math.round(stat.avgReadTime),
            totalViews: stat.totalViews
          },
          articles
        };
      })
    );

    res.json({
      categories: categoriesWithArticles,
      timeframe
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ EXPLORE BY LOCATION
export const exploreByLocation = async (req, res) => {
  try {
    const { country = 'India', state, city } = req.query;
    const limit = parseInt(req.query.limit) || 20;

    let locationQuery = {};
    if (country) locationQuery['location.country'] = country;
    if (state) locationQuery['location.state'] = state;
    if (city) locationQuery['location.city'] = city;

    const news = await News.find(locationQuery)
      .sort({ publishedAt: -1 })
      .limit(limit);

    // Get location statistics
    const locationStats = await News.aggregate([
      { $match: locationQuery },
      {
        $group: {
          _id: '$location.state',
          count: { $sum: 1 },
          cities: { $addToSet: '$location.city' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      news,
      locationStats,
      filters: { country, state, city }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ EXPLORE BY SOURCE
export const exploreBySource = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;

    // Get source statistics
    const sourceStats = await News.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          avgReadTime: { $avg: '$readTime' },
          totalViews: { $sum: '$viewCount' },
          lastArticle: { $max: '$publishedAt' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]);

    // Get latest articles from top sources
    const sourcesWithArticles = await Promise.all(
      sourceStats.slice(0, 10).map(async (stat) => {
        const articles = await News.find({ source: stat._id })
          .sort({ publishedAt: -1 })
          .limit(limit);

        return {
          source: stat._id,
          stats: {
            count: stat.count,
            avgReadTime: Math.round(stat.avgReadTime),
            totalViews: stat.totalViews,
            lastArticle: stat.lastArticle
          },
          articles
        };
      })
    );

    res.json({
      sources: sourcesWithArticles
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET SEARCH SUGGESTIONS
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    const limit = parseInt(req.query.limit) || 10;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Get title suggestions
    const titleSuggestions = await News.find({
      title: { $regex: q, $options: 'i' }
    })
    .select('title')
    .limit(limit);

    // Get tag suggestions
    const tagSuggestions = await News.distinct('tags', {
      tags: { $regex: q, $options: 'i' }
    }).then(tags => tags.slice(0, limit));

    // Get category suggestions
    const categorySuggestions = await News.distinct('category', {
      category: { $regex: q, $options: 'i' }
    });

    res.json({
      suggestions: {
        titles: titleSuggestions.map(article => article.title),
        tags: tagSuggestions,
        categories: categorySuggestions
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET SEARCH HISTORY
export const getSearchHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const user = await User.findById(userId)
      .select('searchHistory')
      .slice('searchHistory', limit);

    res.json({
      searchHistory: user.searchHistory || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ CLEAR SEARCH HISTORY
export const clearSearchHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    await User.findByIdAndUpdate(userId, {
      $set: { searchHistory: [] }
    });

    res.json({ message: "Search history cleared successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};