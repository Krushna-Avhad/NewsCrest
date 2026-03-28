import News from "../models/News.js";
import { generateHatkeSummary, explainSimply, summarizeNews } from "../services/aiService.js";

// ✅ GET HATKE NEWS
export const getHatkeNews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { category } = req.query;

    let query = { hatkeSummary: { $exists: true, $ne: null } };
    if (category) {
      query.category = category;
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
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GENERATE HATKE SUMMARY FOR ARTICLE
export const generateHatkeForArticle = async (req, res) => {
  try {
    const { articleId } = req.params;

    const article = await News.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Generate hatke summary if not already exists
    if (!article.hatkeSummary) {
      const hatkeSummary = await generateHatkeSummary(article.title, article.content);
      
      article.hatkeSummary = hatkeSummary;
      article.aiGenerated.hatkeSummary = true;
      await article.save();
    }

    res.json({
      articleId: article._id,
      title: article.title,
      originalSummary: article.summary,
      hatkeSummary: article.hatkeSummary,
      message: "Hatke summary generated successfully"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET QUICK SUMMARIES
export const getQuickSummaries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const { category, readTime } = req.query;

    let query = { 
      summary: { $exists: true, $ne: null },
      readTime: { $lte: parseInt(readTime) || 5 }
    };
    
    if (category) {
      query.category = category;
    }

    const news = await News.find(query)
      .select('title summary source publishedAt readTime imageUrl category')
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

// ✅ GET SIMPLIFIED VERSION
export const getSimplifiedVersion = async (req, res) => {
  try {
    const { articleId } = req.params;

    const article = await News.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Generate simplified explanation
    const simplifiedContent = await explainSimply(article.title, article.content);

    res.json({
      articleId: article._id,
      title: article.title,
      originalContent: article.content?.substring(0, 500) + '...',
      simplifiedContent,
      message: "Simplified version generated successfully"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GENERATE AI SUMMARY
export const generateAISummary = async (req, res) => {
  try {
    const { articleId } = req.params;

    const article = await News.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Generate AI summary if not already exists
    if (!article.summary || !article.aiGenerated.summary) {
      const aiSummary = await summarizeNews(article.content);
      
      article.summary = aiSummary;
      article.aiGenerated.summary = true;
      await article.save();
    }

    res.json({
      articleId: article._id,
      title: article.title,
      summary: article.summary,
      readTime: article.readTime,
      message: "AI summary generated successfully"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ BATCH GENERATE HATKE SUMMARIES (Admin only)
export const batchGenerateHatke = async (req, res) => {
  try {
    const { limit = 50, category } = req.body;

    let query = { hatkeSummary: { $exists: false } };
    if (category) {
      query.category = category;
    }

    const articles = await News.find(query)
      .limit(limit);

    const results = [];
    
    for (const article of articles) {
      try {
        const hatkeSummary = await generateHatkeSummary(article.title, article.content);
        
        await News.findByIdAndUpdate(article._id, {
          hatkeSummary,
          'aiGenerated.hatkeSummary': true
        });

        results.push({
          articleId: article._id,
          title: article.title,
          success: true,
          hatkeSummary
        });
      } catch (error) {
        results.push({
          articleId: article._id,
          title: article.title,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      message: `Processed ${articles.length} articles`,
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET FUNNY NEWS CATEGORIES
export const getFunnyNewsCategories = async (req, res) => {
  try {
    const categories = await News.aggregate([
      { $match: { hatkeSummary: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          latestArticle: { $max: '$publishedAt' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      categories: categories.map(cat => ({
        name: cat._id,
        count: cat.count,
        latestArticle: cat.latestArticle
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET TRENDING HATKE NEWS
export const getTrendingHatke = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const news = await News.find({ 
      hatkeSummary: { $exists: true, $ne: null },
      trending: true
    })
    .sort({ publishedAt: -1, 'engagement.shares': -1 })
    .limit(limit);

    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET HATKE NEWS BY SENTIMENT
export const getHatkeBySentiment = async (req, res) => {
  try {
    const { sentiment } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const news = await News.find({ 
      hatkeSummary: { $exists: true, $ne: null },
      sentiment: sentiment
    })
    .sort({ publishedAt: -1 })
    .limit(limit);

    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ SHARE HATKE SUMMARY
export const shareHatkeSummary = async (req, res) => {
  try {
    const { articleId } = req.params;

    const article = await News.findById(articleId);
    if (!article || !article.hatkeSummary) {
      return res.status(404).json({ message: "Hatke summary not found" });
    }

    // Generate shareable content
    const shareableContent = {
      title: article.title,
      hatkeSummary: article.hatkeSummary,
      source: article.source,
      url: article.url,
      shareText: `📰 ${article.title}\n\n😂 ${article.hatkeSummary}\n\n📖 Read more: ${article.url}\n\n#NewsCrest #HatkeNews`
    };

    res.json({
      shareableContent,
      message: "Shareable content generated successfully"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
