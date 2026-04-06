import dotenv from "dotenv";
import News from "../models/News.js";
import Groq from "groq-sdk";
import { groqCall, groqCallPriority, trackTokens } from "../utils/groqRateLimiter.js";

dotenv.config();

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GEMINI_API_KEY });

// ── Groq helper ──────────────────────────────────────────────────────────────
async function callGroq(prompt, maxTokens = 300, priority = false, label = "") {
  const fn = async () => {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    });
    // Track token usage to stay under 12,000/min budget
    const tokens = response.usage?.total_tokens || maxTokens;
    trackTokens(tokens);
    return response.choices[0]?.message?.content?.trim() || "";
  };
  return priority ? groqCallPriority(fn, label) : groqCall(fn, label);
}

// ── JSON parser ──────────────────────────────────────────────────────────────
const parseAIJSON = (text) => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in AI response");
    return JSON.parse(jsonMatch[0].trim());
  } catch (err) {
    console.error("AI JSON Parsing Error. Raw Text:", text);
    return {
      reply: "I understood your request, but I'm having trouble formatting the news right now.",
      searchKeywords: [],
      categorySuggestion: "General"
    };
  }
};

// ── Mock fallbacks ────────────────────────────────────────────────────────────
function mockSummary(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("ai") || t.includes("technology")) return "AI and technology continue to advance rapidly, reshaping industries and daily life.";
  if (t.includes("climate") || t.includes("environment")) return "Environmental concerns are driving global discussions on climate action.";
  if (t.includes("market") || t.includes("economy")) return "Financial markets show significant activity amid global economic developments.";
  if (t.includes("health") || t.includes("medical")) return "New medical research offers promising developments for patient care.";
  if (t.includes("sport") || t.includes("cricket")) return "Major sporting events deliver exciting results for fans worldwide.";
  return "This story covers important developments shaping current events and future trends.";
}

function mockHatke(title, content) {
  const t = `${title} ${content || ""}`.toLowerCase();
  if (t.includes("ai") || t.includes("tech")) return "Robots are coming for our jobs but at least they'll be polite about it 🤖 — 'Your position has been terminated, have a nice day!'";
  if (t.includes("climate") || t.includes("environment")) return "Earth: 'I'm burning up!' World leaders: 'We'll have a meeting about that.' Earth: 😤";
  if (t.includes("market") || t.includes("economy")) return "Economists predicted 7 of the last 3 recessions. The market did what it wanted anyway 📈😂";
  if (t.includes("health") || t.includes("doctor")) return "Doctor's advice: eat healthy, sleep 8 hrs, exercise daily, no stress. Patient: lol ok sure 😅";
  if (t.includes("sport") || t.includes("cricket")) return "Sports commentators acting shocked at every single match like they didn't see it coming 🏏😄";
  return "Breaking: Something happened somewhere. Experts have opinions. Twitter is already fighting about it 🔥";
}

// ── AI Methods ───────────────────────────────────────────────────────────────

export const summarizeNews = async (text, articleId = null) => {
  if (!text) return "No content available to summarize.";

  // ✅ Cache check — if already summarized, return from DB for free
  if (articleId) {
    try {
      const existing = await News.findById(articleId).select("aiGenerated.summary");
      if (existing?.aiGenerated?.summary) {
        return existing.aiGenerated.summary; // Zero Groq calls
      }
    } catch (_) {} // non-critical, proceed to generate
  }

  try {
    const prompt = `Summarize this news article in 2-3 concise bullet points:\n\n${text.substring(0, 2000)}`;
    const summary = await callGroq(prompt, 300, false, "summarize");

    // ✅ Persist to DB so future calls are free
    if (articleId) {
      News.findByIdAndUpdate(articleId, {
        $set: { "aiGenerated.summary": summary }
      }).catch(() => {}); // non-blocking, don't await
    }

    return summary;
  } catch (err) {
    console.warn("summarizeNews Groq failed, using mock:", err.message);
    return mockSummary(text);
  }
};

export const generateHatkeSummary = async (title, content) => {
  try {
    const prompt = `You are a witty Indian news reporter with Gen-Z energy.
Write a 2-line Hinglish (Hindi + English mix) summary of this news.
Be dramatic and funny. Use emojis. Sprinkle Gen-Z slang naturally only where it fits — don't force it.
Sound like a viral tweet, not a textbook.

Title: ${title}
Summary: ${(content || "").substring(0, 300)}

Only return the 2-line summary, nothing else.`;
    return await callGroq(prompt, 150, true, "hatke"); // priority = true
  } catch (err) {
    console.warn("generateHatkeSummary Groq failed, using mock:", err.message);
    return mockHatke(title, content);
  }
};

export const explainSimply = async (title, content) => {
  try {
    const prompt = `Explain this news story as if I am a 10-year-old. Use very simple terms and be brief (2-3 lines):
Title: ${title}
Content: ${(content || "").substring(0, 1000)}`;
    return await callGroq(prompt, 300, true, "explain"); // priority = true — user triggered
  } catch (err) {
    console.warn("explainSimply Groq failed, using mock:", err.message);
    return `${title} — This is an important story that affects many people.`;
  }
};

export const compareNews = async (item1, item2) => {
  try {
    const prompt = `Compare these two news articles and output ONLY a raw JSON object with this structure:
{
  "similarities": [{"aspect": "string", "description": "string"}],
  "differences": [{"aspect": "string", "description": "string"}],
  "insights": [{"type": "key_takeaway", "content": "string", "importance": "high"}],
  "overallScore": 0.65,
  "sentiment": {"item1": "neutral", "item2": "neutral", "comparison": "similar_sentiment"}
}

Article 1: ${item1.title} - ${(item1.content || "").substring(0, 500)}
Article 2: ${item2.title} - ${(item2.content || "").substring(0, 500)}`;
    const text = await callGroq(prompt, 500);
    return parseAIJSON(text);
  } catch (err) {
    console.warn("compareNews Groq failed, using mock:", err.message);
    return {
      similarities: [{ aspect: "relevance", description: "Both cover significant current events with broad public impact" }],
      differences: [{ aspect: "focus", description: `"${item1.title?.slice(0, 40)}..." takes a different angle than "${item2.title?.slice(0, 40)}..."` }],
      insights: [{ type: "key_takeaway", content: "Both stories reflect important ongoing developments worth following closely", importance: "high" }],
      overallScore: 0.55,
      sentiment: { item1: "neutral", item2: "neutral", comparison: "similar_sentiment" }
    };
  }
};

export const processChatbotQuery = async (query, user) => {
  try {
    const prompt = `
You are an AI News Assistant. 
User Location: ${user?.city || "India"}, ${user?.state || "Unknown"}
User Interests: ${user?.interests?.join(", ") || "General News"}

The user asked: "${query}"

CRITICAL: Extract search keywords and respond ONLY with this JSON format (no markdown):
{
  "reply": "A brief helpful response to the user",
  "searchKeywords": ["keyword1", "keyword2"],
  "categorySuggestion": "Technology"
}`;

    const text = await callGroq(prompt, 200, true, "chatbot"); // priority = true — user is waiting
    const aiResponse = parseAIJSON(text);
    const searchString = aiResponse.searchKeywords?.join("|") || query;
    const articles = await searchNews(searchString, user);
    return { ...aiResponse, articles: articles || [] };
  } catch (err) {
    console.error("Chatbot logical failure:", err.message);
    const articles = await searchNews(query, user).catch(() => []);
    return {
      reply: "I'm having a bit of trouble searching the news right now. Try asking about a specific topic!",
      articles
    };
  }
};

// ── Database Methods ──────────────────────────────────────────────────────────

export const searchNews = async (keywords, user) => {
  try {
    const limit = 10;
    if (!keywords || keywords.trim() === "") {
      return await News.find().sort({ publishedAt: -1 }).limit(limit);
    }

    const safeKeywords = keywords.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    let query = {
      $or: [
        { title:   { $regex: safeKeywords, $options: "i" } },
        { content: { $regex: safeKeywords, $options: "i" } }
      ]
    };

    if (user?.interests?.length > 0) {
      query = {
        $and: [
          { $or: query.$or },
          { category: { $in: user.interests } }
        ]
      };
    }

    const results = await News.find(query).sort({ publishedAt: -1 }).limit(limit);
    if (results.length === 0) {
      return await News.find().sort({ publishedAt: -1 }).limit(5);
    }
    return results;
  } catch (error) {
    console.error("Database Search Error:", error);
    return await News.find().sort({ publishedAt: -1 }).limit(3);
  }
};

export const filterNewsAdvanced = (news, user) => {
  if (!user?.interests?.length) return news;
  return news.filter((item) => {
    const text = `${item.title || ""} ${item.content || ""}`.toLowerCase();
    return user.interests.some(i => text.includes(i.toLowerCase()));
  });
};

export const getRecommendations = async (userId) => {
  try {
    const { default: User } = await import("../models/User.js");
    const user = await User.findById(userId).populate("readingHistory.articleId");
    if (!user || !user.readingHistory?.length) {
      return await News.find().sort({ trending: -1 }).limit(10);
    }
    const categories = user.readingHistory.map(h => h.articleId?.category).filter(Boolean);
    const freqMap = categories.reduce((acc, cat) => { acc[cat] = (acc[cat] || 0) + 1; return acc; }, {});
    const top = Object.entries(freqMap).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c);
    return await News.find({
      category: { $in: top },
      _id: { $nin: user.readingHistory.map(h => h.articleId?._id).filter(Boolean) }
    }).sort({ publishedAt: -1 }).limit(10);
  } catch (err) {
    console.error("Recommendation Error:", err);
    return await News.find().sort({ trending: -1 }).limit(10);
  }
};
