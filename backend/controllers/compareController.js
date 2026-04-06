import Comparison from "../models/Comparison.js";
import { compareNews } from "../services/aiService.js";
import News from "../models/News.js";

// ── Convert AI result → safe DB shape ────────────────────────────────────────
// We extract only the fields the schema definitely accepts without type errors:
//   similarities: [{ aspect, description, confidence }]
//   differences:  [{ aspect, description, confidence }]
//   insights:     saved as plain strings to survive both [String] and [{...}] schemas
//   overallScore: Number
//   sentiment:    { item1, item2, comparison }
//
// If your Mongoose schema has insights as [String] in practice, we store
// the content string. If it has [{type,content,importance}] we wrap it.
// We try both and fall back gracefully.
function toSafeDB(raw) {
  if (!raw || typeof raw !== "object") return {};

  const toSimDiff = (item) => {
    if (!item) return null;
    if (typeof item === "string")
      return { aspect: "General", description: item.trim(), confidence: 0.5 };
    return {
      aspect: String(item.aspect || item.category || "General").trim(),
      description: String(
        item.description || item.content || item.text || "",
      ).trim(),
      confidence: typeof item.confidence === "number" ? item.confidence : 0.5,
    };
  };

  // For insights: try object shape first; if schema rejects we catch it above
  const toInsight = (item) => {
    if (!item) return null;
    const VALID = ["low", "medium", "high"];
    if (typeof item === "string")
      return {
        type: "key_takeaway",
        content: item.trim(),
        importance: "medium",
      };
    return {
      type: String(item.type || "key_takeaway"),
      content: String(item.content || item.description || ""),
      importance: VALID.includes(item.importance) ? item.importance : "medium",
    };
  };

  const arr = (a, fn) => (Array.isArray(a) ? a.map(fn).filter(Boolean) : []);
  const sent = raw.sentiment || {};

  return {
    similarities: arr(raw.similarities, toSimDiff),
    differences: arr(raw.differences, toSimDiff),
    insights: arr(raw.insights, toInsight),
    overallScore: typeof raw.overallScore === "number" ? raw.overallScore : 0.5,
    sentiment: {
      item1: String(sent.item1 || sent.topic1 || "neutral"),
      item2: String(sent.item2 || sent.topic2 || "neutral"),
      comparison: String(
        sent.comparison ||
          sent.analysis ||
          "Similar sentiment across both articles.",
      ),
    },
  };
}

// ── Safe DB save — never crashes the response ─────────────────────────────────
async function safeSave(payload) {
  try {
    return await Comparison.create(payload);
  } catch (err) {
    // Schema mismatch — try saving with only the primitively-safe subset
    console.warn(
      "Full save failed, retrying with minimal payload:",
      err.message,
    );
    try {
      return await Comparison.create({
        ...payload,
        results: {
          similarities: [],
          differences: [],
          insights: [],
          overallScore: payload.results?.overallScore ?? 0.5,
          sentiment: payload.results?.sentiment ?? {
            item1: "neutral",
            item2: "neutral",
            comparison: "",
          },
        },
      });
    } catch (err2) {
      console.warn("Minimal save also failed, skipping DB save:", err2.message);
      return null; // Return null — caller will still send full result to frontend
    }
  }
}

// ── Build API response (DB record + full AI fields for the frontend) ──────────
function buildResponse(saved, rawResults, item1, item2) {
  const base = saved
    ? { ...saved.toObject(), results: { ...saved.toObject().results } }
    : { item1, item2, createdAt: new Date().toISOString() };

  // Always include the full rich result so the frontend renders all sections
  base.results = {
    ...(base.results || {}),
    // Overwrite with full unsanitised AI data for the frontend
    similarities: rawResults.similarities || [],
    differences: rawResults.differences || [],
    insights: rawResults.insights || [],
    overallScore: rawResults.overallScore ?? 0.5,
    sentiment: rawResults.sentiment || {},
    // Extended fields (not in schema, passed through to frontend only)
    socialImpact: rawResults.socialImpact || null,
  };

  return base;
}

// ── COMPARE BY CONTENT ────────────────────────────────────────────────────────
export const compareArticles = async (req, res) => {
  try {
    const { item1, item2 } = req.body;
    const userId = req.user.id;

    if (!item1 || !item2) {
      return res
        .status(400)
        .json({ message: "Both items to compare are required" });
    }

    let ci1 = { ...item1, type: item1.type || "article" };
    let ci2 = { ...item2, type: item2.type || "article" };

    if (item1.articleId) {
      const a = await News.findById(item1.articleId);
      if (a)
        ci1 = {
          title: a.title,
          content: a.content,
          url: a.url,
          source: a.source,
          type: "article",
        };
    }
    if (item2.articleId) {
      const a = await News.findById(item2.articleId);
      if (a)
        ci2 = {
          title: a.title,
          content: a.content,
          url: a.url,
          source: a.source,
          type: "article",
        };
    }

    const startTime = Date.now();
    const rawResults = await compareNews(ci1, ci2);
    const processingTime = Date.now() - startTime;

    const saved = await safeSave({
      userId,
      item1: ci1,
      item2: ci2,
      results: toSafeDB(rawResults),
      processingTime,
      aiGenerated: true,
    });

    res.json({
      comparison: buildResponse(saved, rawResults, ci1, ci2),
      message: "Comparison completed successfully",
    });
  } catch (err) {
    console.error("Comparison Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── COMPARE BY ARTICLE IDS ────────────────────────────────────────────────────
export const compareArticlesById = async (req, res) => {
  try {
    const { articleId1, articleId2 } = req.params;
    const userId = req.user.id;

    const [article1, article2] = await Promise.all([
      News.findById(articleId1),
      News.findById(articleId2),
    ]);

    if (!article1 || !article2) {
      return res
        .status(404)
        .json({ message: "One or both articles not found" });
    }

    const item1 = {
      title: article1.title,
      content: article1.content,
      url: article1.url,
      source: article1.source,
      type: "article",
    };
    const item2 = {
      title: article2.title,
      content: article2.content,
      url: article2.url,
      source: article2.source,
      type: "article",
    };

    const startTime = Date.now();
    const rawResults = await compareNews(item1, item2);
    const processingTime = Date.now() - startTime;

    const saved = await safeSave({
      userId,
      item1,
      item2,
      results: toSafeDB(rawResults),
      processingTime,
      aiGenerated: true,
    });

    res.json({
      comparison: buildResponse(saved, rawResults, item1, item2),
      message: "Articles compared successfully",
    });
  } catch (err) {
    console.error("Article Comparison Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── GET HISTORY ───────────────────────────────────────────────────────────────
export const getComparisonHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const comparisons = await Comparison.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "item1.title item2.title results.overallScore results.sentiment createdAt processingTime",
      );

    const total = await Comparison.countDocuments({ userId });

    res.json({
      comparisons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET SINGLE ────────────────────────────────────────────────────────────────
export const getComparison = async (req, res) => {
  try {
    const comparison = await Comparison.findOne({
      _id: req.params.comparisonId,
      userId: req.user.id,
    });
    if (!comparison)
      return res.status(404).json({ message: "Comparison not found" });
    res.json({ comparison });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
export const deleteComparison = async (req, res) => {
  try {
    const comparison = await Comparison.findOneAndDelete({
      _id: req.params.comparisonId,
      userId: req.user.id,
    });
    if (!comparison)
      return res.status(404).json({ message: "Comparison not found" });
    res.json({ message: "Comparison deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
