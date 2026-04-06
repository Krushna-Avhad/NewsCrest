import Comparison from "../models/Comparison.js";
import { compareNews } from "../services/aiService.js";
import News from "../models/News.js";

// COMPARE TWO NEWS ITEMS
export const compareArticles = async (req, res) => {
  try {
    const { item1, item2 } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!item1 || !item2) {
      return res.status(400).json({ message: "Both items to compare are required" });
    }

    // If article IDs are provided, fetch full articles
    let comparisonItem1 = { ...item1, type: item1.type || 'article' };
    let comparisonItem2 = { ...item2, type: item2.type || 'article' };

    if (item1.articleId) {
      const article1 = await News.findById(item1.articleId);
      if (article1) {
        comparisonItem1 = {
          title: article1.title,
          content: article1.content,
          url: article1.url,
          source: article1.source,
          type: 'article'
        };
      }
    }

    if (item2.articleId) {
      const article2 = await News.findById(item2.articleId);
      if (article2) {
        comparisonItem2 = {
          title: article2.title,
          content: article2.content,
          url: article2.url,
          source: article2.source,
          type: 'article'
        };
      }
    }

    // Process comparison with AI
    const startTime = Date.now();
    const rawResults = await compareNews(comparisonItem1, comparisonItem2);
    const processingTime = Date.now() - startTime;

    // Sanitize results — ensure arrays contain proper objects, not raw strings
    const comparisonResults = sanitizeComparisonResults(rawResults);

    // Save comparison to database
    const comparison = await Comparison.create({
      userId,
      item1: comparisonItem1,
      item2: comparisonItem2,
      results: comparisonResults,
      processingTime,
      aiGenerated: true
    });

    res.json({
      comparison,
      message: "Comparison completed successfully"
    });
  } catch (err) {
    console.error("Comparison Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── Helper: sanitize AI results before saving to MongoDB ─────────────────────
// Guards against Gemini returning a JSON string instead of parsed array etc.
function sanitizeComparisonResults(raw) {
  if (!raw || typeof raw !== 'object') return {};

  const sanitizeArray = (arr, defaultShape) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
      // If item is a string (mis-parsed), wrap it
      if (typeof item === 'string') return { ...defaultShape, content: item };
      return item;
    });
  };

  return {
    similarities: sanitizeArray(raw.similarities, { aspect: '', description: '', confidence: 0.5 }),
    differences:  sanitizeArray(raw.differences,  { aspect: '', description: '', confidence: 0.5 }),
    insights:     sanitizeArray(raw.insights,      { type: 'key_takeaway', content: '', importance: 'medium' }),
    overallScore: typeof raw.overallScore === 'number' ? raw.overallScore : 0.5,
    sentiment:    raw.sentiment && typeof raw.sentiment === 'object' ? raw.sentiment : {
      item1: 'neutral', item2: 'neutral', comparison: 'similar_sentiment'
    },
  };
}

// COMPARE TWO ARTICLES BY ID
export const compareArticlesById = async (req, res) => {
  try {
    const { articleId1, articleId2 } = req.params;
    const userId = req.user.id;

    // Fetch both articles
    const [article1, article2] = await Promise.all([
      News.findById(articleId1),
      News.findById(articleId2)
    ]);

    if (!article1 || !article2) {
      return res.status(404).json({ message: "One or both articles not found" });
    }

    // Prepare items for comparison
    const item1 = {
      title: article1.title,
      content: article1.content,
      url: article1.url,
      source: article1.source,
      type: 'article'
    };

    const item2 = {
      title: article2.title,
      content: article2.content,
      url: article2.url,
      source: article2.source,
      type: 'article'
    };

    // Process comparison with AI
    const startTime = Date.now();
    const rawResults = await compareNews(item1, item2);
    const processingTime = Date.now() - startTime;
    const comparisonResults = sanitizeComparisonResults(rawResults);

    // Save comparison to database
    const comparison = await Comparison.create({
      userId,
      item1,
      item2,
      results: comparisonResults,
      processingTime,
      aiGenerated: true
    });

    res.json({
      comparison,
      message: "Articles compared successfully"
    });
  } catch (err) {
    console.error("Article Comparison Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET COMPARISON HISTORY
export const getComparisonHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const comparisons = await Comparison.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Comparison.countDocuments({ userId });
    const totalPages = Math.ceil(total / limit);

    res.json({
      comparisons,
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

// GET SINGLE COMPARISON
export const getComparison = async (req, res) => {
  try {
    const { comparisonId } = req.params;
    const userId = req.user.id;

    const comparison = await Comparison.findOne({ _id: comparisonId, userId });

    if (!comparison) {
      return res.status(404).json({ message: "Comparison not found" });
    }

    res.json({ comparison });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE COMPARISON
export const deleteComparison = async (req, res) => {
  try {
    const { comparisonId } = req.params;
    const userId = req.user.id;

    const comparison = await Comparison.findOneAndDelete({ _id: comparisonId, userId });

    if (!comparison) {
      return res.status(404).json({ message: "Comparison not found" });
    }

    res.json({ message: "Comparison deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};