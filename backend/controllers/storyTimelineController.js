// controllers/storyTimelineController.js
import {
  getStoriesForUser,
  getStoryById,
  getTimelineForArticle,
  followStory,
  unfollowStory,
  processArticleIntoTimeline,
  generateTimelineFromInput,
  getUserActivityHistory,
  recordUserActivity,
} from "../services/storyTimelineService.js";
import User from "../models/User.js";
import News from "../models/News.js";
import StoryTimeline from "../models/StoryTimeline.js";
import mongoose from "mongoose";
import UserActivity from "../models/UserActivity.js";
// getAllArticlesForDropdown is defined in this file and uses News directly

// ── GET /api/timeline/my-stories ─────────────────────────────────────────────
export const getMyStories = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const dismissedIds = new Set((user.dismissedStories || []).map(id => id.toString()));
    const stories = await getStoriesForUser(user, 20);
    const filtered = stories.filter(s => !dismissedIds.has(s._id?.toString()));
    res.json({ stories: filtered });
  } catch (err) {
    console.error("getMyStories error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE /api/timeline/story/:storyId ──────────────────────────────────────
// Dismiss a story from this user's timeline view (does not delete the story itself)
export const dismissStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { dismissedStories: storyId }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/timeline/story/:storyId ─────────────────────────────────────────
export const getStory = async (req, res) => {
  try {
    const story = await getStoryById(req.params.storyId);
    if (!story) return res.status(404).json({ error: "Story not found" });
    res.json({ story });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/timeline/article/:articleId ─────────────────────────────────────
export const getArticleTimeline = async (req, res) => {
  try {
    const story = await getTimelineForArticle(req.params.articleId);
    res.json({ story: story || null });
  } catch (err) {
    console.error("getArticleTimeline error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/timeline/for-saved-articles ────────────────────────────────────
// Takes an array of article IDs and returns all timelines that contain any of them.
// This replaces the old N-loop approach on the frontend with a single DB query.
export const getStoriesForSavedArticles = async (req, res) => {
  try {
    const { articleIds } = req.body;
    if (!articleIds?.length) return res.json({ stories: [] });

    // Cast string IDs to ObjectId so MongoDB $in matches correctly
    const objectIds = articleIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (!objectIds.length) return res.json({ stories: [] });

    const user = await User.findById(req.user.id).select("dismissedStories");
    const dismissedIds = new Set((user?.dismissedStories || []).map(id => id.toString()));

    const stories = await StoryTimeline.find({
      isActive: true,
      "articles.articleId": { $in: objectIds },
    })
      .sort({ lastUpdatedAt: -1 })
      .limit(30)
      .populate({
        path: "articles.articleId",
        model: "News",
        select: "title summary imageUrl category source publishedAt url readTime",
      });

    const cleaned = stories
      .map(s => {
        const obj = s.toObject();
        obj.articles = obj.articles.filter(a => a.articleId?.title);
        return obj;
      })
      .filter(s => s.articles.length >= 1 && !dismissedIds.has(s._id?.toString()));

    res.json({ stories: cleaned });
  } catch (err) {
    console.error("getStoriesForSavedArticles error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/timeline/follow/:storyId ───────────────────────────────────────
export const followAStory = async (req, res) => {
  try {
    const story = await followStory(req.params.storyId, req.user.id, "manual");
    res.json({ message: "Now following story", story });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE /api/timeline/follow/:storyId ─────────────────────────────────────
export const unfollowAStory = async (req, res) => {
  try {
    await unfollowStory(req.params.storyId, req.user.id);
    res.json({ message: "Unfollowed story" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/timeline/process/:articleId ────────────────────────────────────
export const processArticle = async (req, res) => {
  try {
    const article = await News.findById(req.params.articleId);
    if (!article) return res.status(404).json({ error: "Article not found" });
    const story = await processArticleIntoTimeline(article);
    res.json({ message: "Processed", story });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/timeline/process-batch ─────────────────────────────────────────
export const processBatch = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const articles = await News.find().sort({ publishedAt: -1 }).limit(limit);
    let processed = 0;
    for (const article of articles) {
      await processArticleIntoTimeline(article);
      processed++;
      await new Promise(r => setTimeout(r, 500));
    }
    res.json({ message: `Processed ${processed} articles into story timelines` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/timeline/trending ───────────────────────────────────────────────
export const getTrendingStories = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const stories = await StoryTimeline.find({
      isActive: true,
      $expr: { $gt: [{ $size: "$articles" }, 1] },
    })
      .sort({ lastUpdatedAt: -1 })
      .limit(limit)
      .populate({
        path: "articles.articleId",
        model: "News",
        select: "title imageUrl category source publishedAt",
      });

    const cleaned = stories.map(s => {
      const obj = s.toObject();
      obj.articles = obj.articles.filter(a => a.articleId?.title);
      return obj;
    });
    res.json({ stories: cleaned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/timeline/generate ──────────────────────────────────────────────
// Manual input: user pastes a headline → system generates a timeline
// Body: { input: "headline text" }
export const generateFromInput = async (req, res) => {
  try {
    const { input } = req.body;
    if (!input?.trim()) {
      return res.status(400).json({ error: "Input text is required" });
    }
    const story = await generateTimelineFromInput(input.trim());
    if (!story) {
      return res.json({
        story: null,
        message: "No related articles found for that topic. Try different keywords.",
      });
    }
    res.json({ story });
  } catch (err) {
    console.error("generateFromInput error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/timeline/all-articles ───────────────────────────────────────────
// Returns ALL articles from the News DB for dropdowns.
// Supports ?search=keyword to filter by title (case-insensitive).
// No hard limit — returns everything so dropdowns are complete.
export const getAllArticlesForDropdown = async (req, res) => {
  try {
    const { search } = req.query;
    const query = search
      ? { title: { $regex: search, $options: "i" } }
      : {};

    const articles = await News.find(query)
      .sort({ publishedAt: -1 })
      .select("title summary category source publishedAt imageUrl url");

    const items = articles.map(a => ({
      articleId:   a._id,
      title:       a.title       || "",
      description: a.summary     || "",
      category:    a.category    || "",
      source:      a.source      || "",
      imageUrl:    a.imageUrl    || "",
      publishedAt: a.publishedAt || null,
    }));

    res.json({ articles: items });
  } catch (err) {
    console.error("Error fetching articles:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/timeline/history ────────────────────────────────────────────────
export const getUserHistory = async (req, res) => {
  try {
    const activities = await getUserActivityHistory(req.user.id, 40);
    const items = activities.map(a => ({
      activityId:  a._id,
      action:      a.action,
      articleId:   a.articleId,
      title:       a.snapshot?.title       || "",
      description: a.snapshot?.description || "",
      category:    a.snapshot?.category    || "",
      source:      a.snapshot?.source      || "",
      imageUrl:    a.snapshot?.imageUrl    || "",
      actedAt:     a.actedAt,
    }));
    res.json({ history: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/timeline/generate-from-history ─────────────────────────────────
export const generateFromHistory = async (req, res) => {
  try {
    const { articleId, title, description } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: "title is required" });
    }

    // If we have a real articleId, look up the full article from DB so we can
    // use its category + tags for strict filtering — avoids unrelated matches.
    let category = "";
    let tags = [];
    if (articleId && mongoose.Types.ObjectId.isValid(articleId)) {
      try {
        const article = await News.findById(articleId).select("category tags");
        if (article) {
          category = article.category || "";
          tags = article.tags || [];
        }
      } catch (_) {}
    }

    const searchText = `${title.trim()} ${description || ""}`.trim();
    const story = await generateTimelineFromInput(searchText, null, { category, tags });
    if (!story) {
      return res.json({
        story: null,
        message: "No related articles found for this story.",
      });
    }
    res.json({ story });
  } catch (err) {
    console.error("generateFromHistory error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/timeline/record-activity ───────────────────────────────────────
export const recordActivity = async (req, res) => {
  try {
    const { action, article } = req.body;
    if (!action || !article?.title) {
      return res.status(400).json({ error: "action and article.title are required" });
    }
    await recordUserActivity(req.user.id, action, article);
    res.json({ message: "Activity recorded" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
