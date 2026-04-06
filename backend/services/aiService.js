import dotenv from "dotenv";
import News from "../models/News.js";

dotenv.config();

// ── Grok API ──────────────────────────────────────────────────────────────────
const GROK_URL = "https://api.x.ai/v1/chat/completions";
const GROK_MODEL = "grok-3-mini"; // free tier — no credits needed

async function callGrok(systemPrompt, userPrompt) {
  const res = await fetch(GROK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      temperature: 0.3,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Grok ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── JSON parser ───────────────────────────────────────────────────────────────
function parseJSON(text) {
  try {
    const clean = text
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found");
    return JSON.parse(match[0]);
  } catch (err) {
    console.error("JSON parse error:", err.message);
    return null;
  }
}

// ── Mock fallbacks ────────────────────────────────────────────────────────────
function mockSummary(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("ai") || t.includes("technology"))
    return "AI and technology continue to advance rapidly, reshaping industries and daily life.";
  if (t.includes("climate") || t.includes("environment"))
    return "Environmental concerns are driving global discussions on climate action.";
  if (t.includes("market") || t.includes("economy"))
    return "Financial markets show significant activity amid global economic developments.";
  if (t.includes("health") || t.includes("medical"))
    return "New medical research offers promising developments for patient care.";
  if (t.includes("sport") || t.includes("cricket"))
    return "Major sporting events deliver exciting results for fans worldwide.";
  return "This story covers important developments shaping current events and future trends.";
}

function mockHatke(title, content) {
  const t = `${title} ${content || ""}`.toLowerCase();
  if (t.includes("ai") || t.includes("tech"))
    return "Robots are coming for our jobs but they'll be polite about it! 'Your position has been terminated, have a nice day!'";
  if (t.includes("climate") || t.includes("environment"))
    return "Earth: 'I'm burning up!' World leaders: 'We'll schedule a meeting.' Earth: disappointed.";
  if (t.includes("market") || t.includes("economy"))
    return "Economists predicted 7 of the last 3 recessions. The market did what it wanted anyway.";
  if (t.includes("sport") || t.includes("cricket"))
    return "Sports commentators acting shocked at every match like they didn't see it coming.";
  return "Breaking: Something happened somewhere. Experts have opinions. Twitter is already fighting about it.";
}

// Mock compare — objects match Mongoose schema exactly
function mockCompare(item1, item2) {
  const t1 = (item1.title || "Article 1").slice(0, 50);
  const t2 = (item2.title || "Article 2").slice(0, 50);
  return {
    similarities: [
      {
        aspect: "Public Relevance",
        description:
          "Both articles address issues of significant public interest.",
        confidence: 0.75,
      },
      {
        aspect: "News Category",
        description: "Both stories fall within the same broad news domain.",
        confidence: 0.7,
      },
    ],
    differences: [
      {
        aspect: "Topic Focus",
        description: `"${t1}" covers a distinct angle compared to "${t2}".`,
        confidence: 0.8,
      },
      {
        aspect: "Geographical Scope",
        description:
          "The two articles differ in the regions and communities they address.",
        confidence: 0.7,
      },
    ],
    insights: [
      {
        type: "key_takeaway",
        content:
          "Reading both articles together offers a fuller understanding of the broader news landscape.",
        importance: "high",
      },
      {
        type: "key_takeaway",
        content:
          "Each article highlights a different dimension of public affairs worth following.",
        importance: "medium",
      },
    ],
    overallScore: 0.55,
    sentiment: {
      item1: "neutral",
      item2: "neutral",
      comparison:
        "Both articles maintain a balanced and neutral tone in their reporting.",
    },
    socialImpact: {
      item1: {
        level: "medium",
        areas: ["Public Awareness", "Policy"],
        summary: "Likely to inform public debate and policy discussion.",
      },
      item2: {
        level: "medium",
        areas: ["Community", "Society"],
        summary:
          "Expected to influence community awareness and civic discourse.",
      },
      overall:
        "Both stories carry medium social impact and contribute to informed public discourse.",
    },
  };
}

// ── Exported AI methods ───────────────────────────────────────────────────────

export const summarizeNews = async (text) => {
  if (!text) return "No content available to summarize.";
  try {
    const reply = await callGrok(
      "You are a concise news summarizer. Respond in plain text only.",
      `Summarize this news article in 2-3 concise bullet points:\n\n${text.slice(0, 2000)}`,
    );
    return reply.trim();
  } catch (err) {
    console.warn("summarizeNews Grok failed:", err.message);
    return mockSummary(text);
  }
};

export const generateHatkeSummary = async (title, content) => {
  try {
    const reply = await callGrok(
      "You write short, witty, viral Hinglish social media posts about news. Use emojis.",
      `Write a 2-line funny Hinglish summary of:\nTitle: ${title}\nSummary: ${(content || "").slice(0, 300)}`,
    );
    return reply.trim();
  } catch (err) {
    console.warn("generateHatkeSummary Grok failed:", err.message);
    return mockHatke(title, content);
  }
};

export const explainSimply = async (title, content) => {
  try {
    const reply = await callGrok(
      "You explain news simply, as if to a 10-year-old. Be brief.",
      `Explain in 2-3 simple lines:\nTitle: ${title}\nContent: ${(content || "").slice(0, 1000)}`,
    );
    return reply.trim();
  } catch (err) {
    console.warn("explainSimply Grok failed:", err.message);
    return `${title} — This is an important story that affects many people.`;
  }
};

// ── compareNews — full structured output ──────────────────────────────────────
export const compareNews = async (item1, item2) => {
  const prompt = `Compare these two news articles. Return ONLY a valid JSON object — no markdown, no explanation, no code fences.

Required JSON structure:
{
  "similarities": [
    { "aspect": "string", "description": "string", "confidence": 0.8 }
  ],
  "differences": [
    { "aspect": "string", "description": "string", "confidence": 0.8 }
  ],
  "insights": [
    { "type": "key_takeaway", "content": "string", "importance": "high" }
  ],
  "overallScore": 0.65,
  "sentiment": {
    "item1": "positive|negative|neutral|mixed",
    "item2": "positive|negative|neutral|mixed",
    "comparison": "one sentence comparing the tone of both articles"
  },
  "socialImpact": {
    "item1": { "level": "high|medium|low", "areas": ["area1", "area2"], "summary": "one sentence" },
    "item2": { "level": "high|medium|low", "areas": ["area1", "area2"], "summary": "one sentence" },
    "overall": "one sentence comparing overall social impact"
  }
}

Rules:
- similarities and differences: 2-4 items each
- insights: 2-3 items, importance must be "low", "medium", or "high"
- confidence must be a number 0-1
- overallScore must be a number 0-1
- Return ONLY the JSON object, nothing else

Article 1:
Title: ${item1.title}
Content: ${(item1.content || item1.summary || "").slice(0, 600)}

Article 2:
Title: ${item2.title}
Content: ${(item2.content || item2.summary || "").slice(0, 600)}`;

  try {
    const text = await callGrok(
      "You are a precise JSON-only news comparison AI. Never include markdown or explanation.",
      prompt,
    );
    const parsed = parseJSON(text);

    if (
      !parsed ||
      (!Array.isArray(parsed.similarities) &&
        !Array.isArray(parsed.differences))
    ) {
      throw new Error("Grok returned invalid JSON structure");
    }

    // Ensure importance values are valid
    if (Array.isArray(parsed.insights)) {
      const VALID = ["low", "medium", "high"];
      parsed.insights = parsed.insights.map((i) => ({
        ...i,
        importance: VALID.includes(i?.importance) ? i.importance : "medium",
      }));
    }

    return parsed;
  } catch (err) {
    console.warn("compareNews Grok failed, using mock:", err.message);
    return mockCompare(item1, item2);
  }
};

export const processChatbotQuery = async (query, user) => {
  try {
    const reply = await callGrok(
      `You are an AI News Assistant. User is from ${user?.city || "India"}, ${user?.state || ""}. Interests: ${user?.interests?.join(", ") || "General News"}. Respond ONLY with valid JSON.`,
      `User asked: "${query}"\n\nRespond with ONLY this JSON:\n{"reply":"string","searchKeywords":["kw1","kw2"],"categorySuggestion":"Technology"}`,
    );
    const aiResponse = parseJSON(reply) || {
      reply: "Let me find that for you.",
      searchKeywords: [query],
      categorySuggestion: "General",
    };
    const searchString = aiResponse.searchKeywords?.join("|") || query;
    const articles = await searchNews(searchString, user);
    return { ...aiResponse, articles: articles || [] };
  } catch (err) {
    console.error("Chatbot Grok failed:", err.message);
    const articles = await searchNews(query, user).catch(() => []);
    return {
      reply: "I'm having trouble right now. Try a specific topic!",
      articles,
    };
  }
};

// ── Database helpers ──────────────────────────────────────────────────────────
export const searchNews = async (keywords, user) => {
  try {
    const limit = 10;
    if (!keywords || keywords.trim() === "") {
      return await News.find().sort({ publishedAt: -1 }).limit(limit);
    }
    const safe = keywords.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let query = {
      $or: [
        { title: { $regex: safe, $options: "i" } },
        { content: { $regex: safe, $options: "i" } },
      ],
    };
    if (user?.interests?.length) {
      query = {
        $and: [{ $or: query.$or }, { category: { $in: user.interests } }],
      };
    }
    const results = await News.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit);
    return results.length
      ? results
      : await News.find().sort({ publishedAt: -1 }).limit(5);
  } catch (err) {
    console.error("searchNews error:", err);
    return await News.find().sort({ publishedAt: -1 }).limit(3);
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
    if (!user || !user.readingHistory?.length)
      return await News.find().sort({ trending: -1 }).limit(10);
    const cats = user.readingHistory
      .map((h) => h.articleId?.category)
      .filter(Boolean);
    const freqMap = cats.reduce((acc, c) => {
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});
    const top = Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
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
    console.error("getRecommendations error:", err);
    return await News.find().sort({ trending: -1 }).limit(10);
  }
};
