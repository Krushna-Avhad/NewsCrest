import dotenv from "dotenv";
import News from "../models/News.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Helper to clean and parse JSON from Gemini's response.
 * Handles cases where the AI includes markdown backticks (```json ... ```).
 */
const parseAIJSON = (text) => {
  try {
    const cleanJSON = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJSON);
  } catch (err) {
    console.error("AI JSON Parsing Error:", err.message);
    throw new Error("Failed to parse AI response as valid JSON.");
  }
};

// ── AI Methods ──────────────────────────────────────────────────────────────

export const summarizeNews = async (text) => {
  if (!text) return "No content available to summarize.";
  
  const prompt = `Summarize this news article in 2-3 concise bullet points:\n\n${text.substring(0, 2000)}`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

export const generateHatkeSummary = async (title, content) => {
  const prompt = `Write a short, witty, and funny Hinglish (Hindi + English) summary (2 lines) of this news. 
  Use emojis and sound like a viral social media post. 
  Title: ${title}
  Content: ${(content || "").substring(0, 1000)}`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

export const explainSimply = async (title, content) => {
  const prompt = `Explain this news story as if I am a 10-year-old. Use very simple terms and be brief (2-3 lines):
  Title: ${title}
  Content: ${(content || "").substring(0, 1000)}`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

export const compareNews = async (item1, item2) => {
  const prompt = `Compare these two news articles and output ONLY a raw JSON object with this structure:
  {
    "similarities": [{"aspect": "string", "description": "string"}],
    "differences": [{"aspect": "string", "description": "string"}],
    "overallComparison": "string",
    "sentiment": {"item1": "string", "item2": "string"}
  }

  Article 1: ${item1.title} - ${item1.content?.substring(0, 500)}
  Article 2: ${item2.title} - ${item2.content?.substring(0, 500)}`;

  const result = await model.generateContent(prompt);
  return parseAIJSON(result.response.text());
};

export const processChatbotQuery = async (query, user) => {
  const prompt = `You are an AI News Assistant. The user asked: "${query}".
  Identify their search intent and extract keywords. Respond ONLY with this JSON format:
  {
    "reply": "A brief helpful response to the user",
    "searchKeywords": ["keyword1", "keyword2"],
    "categorySuggestion": "Technology/Sports/etc"
  }`;

  const result = await model.generateContent(prompt);
  const aiResponse = parseAIJSON(result.response.text());

  // Search the real database based on AI's keywords
  const articles = await searchNews(aiResponse.searchKeywords.join(" "), user);
  
  return {
    ...aiResponse,
    articles
  };
};

// ── Database Methods ─────────────────────────────────────────────────────────

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

    // Personalized filtering if user has interests
    if (user?.interests?.length > 0) {
      query = {
        $and: [
          query,
          {
            $or: [
              { category: { $in: user.interests } },
              { tags: { $in: user.interests } },
            ],
          },
        ],
      };
    }

    return await News.find(query).sort({ publishedAt: -1 }).limit(limit);
  } catch (error) {
    console.error("Database Search Error:", error);
    return [];
  }
};

export const getRecommendations = async (userId) => {
  try {
    const { default: User } = await import("../models/User.js");
    const user = await User.findById(userId).populate("readingHistory.articleId");

    if (!user || !user.readingHistory?.length) {
      // Fallback to trending news if history is empty
      return await News.find().sort({ trending: -1 }).limit(10);
    }

    // Extract top categories from reading history
    const categories = user.readingHistory
      .map(h => h.articleId?.category)
      .filter(Boolean);

    const freqMap = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    const favoriteCategories = Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([cat]) => cat);

    return await News.find({
      category: { $in: favoriteCategories },
      _id: { $nin: user.readingHistory.map(h => h.articleId?._id).filter(Boolean) }
    }).sort({ publishedAt: -1 }).limit(10);
  } catch (err) {
    console.error("Recommendation Error:", err);
    return await News.find().sort({ trending: -1 }).limit(10);
  }
};

/**
 * Local utility to filter news based on user interest keywords.
 * This is used by the controller for initial filtering.
 */
export const filterNewsAdvanced = (news, user) => {
  if (!user?.interests?.length) return news;
  
  return news.filter((item) => {
    const title = (item.title || "").toLowerCase();
    const description = (item.description || "").toLowerCase();
    const content = (item.content || "").toLowerCase();
    
    // Check if any of the user's interests appear in the title, description, or content
    return user.interests.some((interest) => {
      const lowerInterest = interest.toLowerCase();
      return (
        title.includes(lowerInterest) || 
        description.includes(lowerInterest) || 
        content.includes(lowerInterest)
      );
    });
  });
};