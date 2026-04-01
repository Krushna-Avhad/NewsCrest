import dotenv from "dotenv";
import News from "../models/News.js";
dotenv.config();

// ✅ Auto-fallback: use mock if Gemini key is missing or invalid
let useGemini = !!process.env.GEMINI_API_KEY;
let genAI = null;

if (useGemini) {
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("✅ Gemini AI loaded");
  } catch (err) {
    console.warn("⚠️  Gemini load failed — using mock AI:", err.message);
    useGemini = false;
  }
} else {
  console.warn("⚠️  GEMINI_API_KEY not set — using mock AI responses");
}

// ── Helper: get Gemini model with fallback ────────────────────────────────────
async function geminiGenerate(prompt) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ── Mock responses (used when Gemini is unavailable) ─────────────────────────
function mockSummary(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("ai") || t.includes("technology"))
    return "AI and technology continue to advance rapidly, reshaping industries and daily life.";
  if (t.includes("climate") || t.includes("environment"))
    return "Environmental concerns are driving global discussions on climate action.";
  if (t.includes("market") || t.includes("economy") || t.includes("finance"))
    return "Financial markets show significant activity amid global economic developments.";
  if (t.includes("health") || t.includes("medical"))
    return "New medical research offers promising developments for patient care.";
  if (t.includes("sport") || t.includes("cricket") || t.includes("football"))
    return "Major sporting events deliver exciting results for fans worldwide.";
  return "This story covers important developments shaping current events and future trends.";
}

function mockHatke(title, content) {
  const t = `${title} ${content || ""}`.toLowerCase();
  if (t.includes("ai") || t.includes("tech"))
    return "Robots are coming for our jobs but at least they'll be polite about it 🤖 — 'Your position has been terminated, have a nice day!'";
  if (t.includes("climate") || t.includes("environment"))
    return "Earth: 'I'm burning up!' World leaders: 'We'll have a meeting about that.' Earth: 😤";
  if (t.includes("market") || t.includes("stock") || t.includes("economy"))
    return "Economists predicted 7 of the last 3 recessions. The market did what it wanted anyway 📈😂";
  if (t.includes("health") || t.includes("doctor"))
    return "Doctor's advice: eat healthy, sleep 8 hrs, exercise daily, no stress. Patient: lol ok sure 😅";
  if (t.includes("sport") || t.includes("cricket"))
    return "Sports commentators acting shocked at every single match like they didn't see it coming 🏏😄";
  return "Breaking: Something happened somewhere. Experts have opinions. Twitter is already fighting about it.";
}

function mockCompare(item1, item2) {
  return {
    similarities: [
      {
        aspect: "relevance",
        description:
          "Both cover significant current events with broad public impact",
        confidence: 0.75,
      },
      {
        aspect: "coverage",
        description:
          "Both have been reported by multiple credible news sources",
        confidence: 0.7,
      },
    ],
    differences: [
      {
        aspect: "focus",
        description: `"${item1.title?.slice(0, 40)}..." takes a different angle than "${item2.title?.slice(0, 40)}..."`,
        confidence: 0.65,
      },
      {
        aspect: "scope",
        description:
          "The two stories differ in their geographic and demographic impact",
        confidence: 0.6,
      },
    ],
    insights: [
      {
        type: "key_takeaway",
        content:
          "Both stories reflect important ongoing developments worth following closely",
        importance: "high",
      },
    ],
    overallScore: 0.55,
    sentiment: {
      item1: "neutral",
      item2: "neutral",
      comparison: "similar_sentiment",
    },
  };
}

function mockChatbot(query) {
  const q = (query || "").toLowerCase();
  let response = "Here are the latest news stories I found for you.";
  let categories = ["Top Headlines", "Technology", "Business"];

  if (q.includes("tech") || q.includes("ai")) {
    response = "Here are the latest technology and AI updates!";
    categories = ["Technology", "Science"];
  } else if (q.includes("sport") || q.includes("cricket")) {
    response = "Latest sports updates coming right up!";
    categories = ["Sports"];
  } else if (q.includes("health")) {
    response = "Here are the latest health news stories.";
    categories = ["Health", "Science"];
  } else if (
    q.includes("business") ||
    q.includes("finance") ||
    q.includes("market")
  ) {
    response = "Here are the latest business and finance stories.";
    categories = ["Business", "Finance"];
  } else if (q.includes("india")) {
    response = "Here's what's happening in India today.";
    categories = ["India", "Politics"];
  } else if (q.includes("world") || q.includes("global")) {
    response = "Top global stories for you.";
    categories = ["World", "Politics"];
  }

  return {
    intent: "search",
    response,
    suggestedCategories: categories,
    searchKeywords: [query],
    articles: [],
  };
}

// ── Exported functions ────────────────────────────────────────────────────────

export const summarizeNews = async (text) => {
  if (!useGemini || !genAI) return mockSummary(text);
  try {
    return await geminiGenerate(
      `Summarize this news in 2-3 simple lines:\n${(text || "").substring(0, 1000)}`,
    );
  } catch (err) {
    console.warn("Gemini summarize failed, using mock:", err.message);
    return mockSummary(text);
  }
};

export const generateHatkeSummary = async (title, content) => {
  if (!useGemini || !genAI) return mockHatke(title, content);
  try {
    const prompt = `Write a short, witty, funny Hinglish/English summary (2-3 lines) of this news. Be humorous:\nTitle: ${title}\n${(content || "").substring(0, 500)}`;
    return await geminiGenerate(prompt);
  } catch (err) {
    console.warn("Gemini hatke failed, using mock:", err.message);
    return mockHatke(title, content);
  }
};

export const explainSimply = async (title, content) => {
  if (!useGemini || !genAI)
    return `${title} — This is an important story that affects many people.`;
  try {
    const prompt = `Explain this news in very simple language a 10-year-old would understand (2-3 lines):\n${title}\n${(content || "").substring(0, 500)}`;
    return await geminiGenerate(prompt);
  } catch (err) {
    return `${title} — This is an important story that affects many people.`;
  }
};

export const compareNews = async (item1, item2) => {
  if (!useGemini || !genAI) return mockCompare(item1, item2);
  try {
    const prompt = `Compare these two news items and respond ONLY with valid JSON (no markdown):
{
  "similarities": [{"aspect": "string", "description": "string", "confidence": 0.8}],
  "differences":  [{"aspect": "string", "description": "string", "confidence": 0.7}],
  "insights":     [{"type": "string",   "content": "string",     "importance": "high"}],
  "overallScore": 0.75,
  "sentiment":    {"item1": "positive", "item2": "neutral", "comparison": "item1_more_positive"}
}

Item 1: ${item1.title}\n${(item1.content || "").substring(0, 400)}
Item 2: ${item2.title}\n${(item2.content || "").substring(0, 400)}`;

    const text = await geminiGenerate(prompt);
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.warn("Gemini compare failed, using mock:", err.message);
    return mockCompare(item1, item2);
  }
};

export const processChatbotQuery = async (query, user) => {
  if (!useGemini || !genAI) {
    // Still search DB even with mock
    const mock = mockChatbot(query);
    try {
      const articles = await searchNews(query, user);
      mock.articles = articles;
    } catch (_) {}
    return mock;
  }
  try {
    const prompt = `You are a news assistant. The user asked: "${query}".
Respond ONLY with valid JSON (no markdown):
{
  "intent": "search",
  "response": "your helpful response here",
  "suggestedCategories": ["Category1", "Category2"],
  "searchKeywords": ["keyword1", "keyword2"]
}`;
    const text = await geminiGenerate(prompt);
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    // Always search DB for real articles
    const articles = await searchNews(
      parsed.searchKeywords?.join(" ") || query,
      user,
    );
    return { ...parsed, articles };
  } catch (err) {
    console.warn("Gemini chatbot failed, using mock:", err.message);
    const mock = mockChatbot(query);
    try {
      mock.articles = await searchNews(query, user);
    } catch (_) {}
    return mock;
  }
};

export const searchNews = async (keywords, user) => {
  try {
    const limit = 10;
    let query = {
      $or: [
        { title: { $regex: keywords, $options: "i" } },
        { content: { $regex: keywords, $options: "i" } },
        { tags: { $in: [new RegExp(keywords, "i")] } },
      ],
    };
    if (user?.interests?.length > 0) {
      query.$and = [
        {
          $or: [
            { category: { $in: user.interests } },
            { tags: { $in: user.interests } },
          ],
        },
      ];
    }
    return await News.find(query).sort({ publishedAt: -1 }).limit(limit);
  } catch (error) {
    console.error("Search Error:", error);
    return [];
  }
};

export const filterNewsAdvanced = (news, user) => {
  if (!user?.interests?.length) return news;
  return news.filter((item) => {
    const text = `${item.title || ""} ${item.content || ""}`.toLowerCase();
    return user.interests.some((i) => text.includes(i.toLowerCase()));
  });
};

export const getRecommendations = async (userId) => {
  try {
    const { default: User } = await import("../models/User.js");
    const user = await User.findById(userId).populate(
      "readingHistory.articleId",
    );
    if (!user?.readingHistory?.length) {
      return await News.find().sort({ trending: -1 }).limit(10);
    }
    const cats = user.readingHistory
      .map((h) => h.articleId?.category)
      .filter(Boolean);
    const freq = {};
    cats.forEach((c) => {
      freq[c] = (freq[c] || 0) + 1;
    });
    const top = Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([c]) => c);
    return await News.find({
      category: { $in: top },
      _id: {
        $nin: user.readingHistory.map((h) => h.articleId?._id).filter(Boolean),
      },
    })
      .sort({ publishedAt: -1 })
      .limit(10);
  } catch (err) {
    return await News.find().sort({ trending: -1 }).limit(10);
  }
};
