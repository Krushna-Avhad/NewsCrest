import dotenv from "dotenv";
import News from "../models/News.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use gemini-2.5-flash for the best balance of speed and reliability
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Helper to clean and parse JSON from Gemini's response.
 * Handles cases where the AI includes markdown backticks (```json ... ```).
 */
const parseAIJSON = (text) => {
  try {
    // 1. Find the first '{' and the last '}' to extract only the JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("No JSON object found in AI response");
    }

    const cleanJSON = jsonMatch[0].trim();
    return JSON.parse(cleanJSON);
  } catch (err) {
    console.error("AI JSON Parsing Error. Raw Text received:", text);
    // Return a fallback object so the app doesn't crash
    return {
      reply: "I understood your request, but I'm having trouble formatting the news right now.",
      searchKeywords: [],
      categorySuggestion: "General"
    };
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

// export const processChatbotQuery = async (query, user) => {
//   try {
//     const prompt = `You are an AI News Assistant. The user asked: "${query}".
//     Extract search keywords and respond ONLY with a valid JSON object. 
//     No markdown, no preamble.
//     {
//       "reply": "A brief helpful response to the user",
//       "searchKeywords": ["keyword1", "keyword2"],
//       "categorySuggestion": "Technology/Sports/etc"
//     }`;

//     const result = await model.generateContent(prompt);
//     const responseText = result.response.text();
//     const aiResponse = parseAIJSON(responseText);

//     // Join keywords with a pipe | for a "OR" search in Regex
//     const searchString = aiResponse.searchKeywords.join("|");
//     const articles = await searchNews(searchString, user);
    
//     return {
//       ...aiResponse,
//       articles
//     };
//   } catch (err) {
//     console.error("Chatbot Processing Error:", err.message);
//     return {
//       reply: "I'm having a little trouble connecting to my news brain right now. Can you try asking about a specific topic like 'India' or 'Finance'?",
//       articles: []
//     };
//   }
// };

export const processChatbotQuery = async (query, user) => {
  try {
    // 1. Define the prompt properly inside the function scope
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
      }
    `;

    // 2. Call the model using the prompt defined right above
    const result = await model.generateContent(prompt);
    
    if (!result.response) {
      throw new Error("AI returned an empty response");
    }

    const aiResponse = parseAIJSON(result.response.text());

    // 3. Search logic using the keywords extracted by AI
    const searchString = aiResponse.searchKeywords?.join("|") || query;
    const articles = await searchNews(searchString, user);
    
    return {
      ...aiResponse,
      articles: articles || []
    };
  } catch (err) {
    // This was the error you saw in the console
    console.error("Chatbot logical failure:", err.message); 
    
    return {
      reply: "I'm having a bit of trouble searching the news right now. Try asking about a specific topic!",
      articles: []
    };
  }
};

// ── Database Methods ─────────────────────────────────────────────────────────

export const searchNews = async (keywords, user) => {
  try {
    const limit = 10;
    
    // 1. Safety Check: If no keywords, return trending or recent news
    if (!keywords || keywords.trim() === "") {
      return await News.find().sort({ publishedAt: -1 }).limit(limit);
    }

    // 2. Escape special characters to prevent Regex crashes
    const safeKeywords = keywords.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let query = {
      $or: [
        { title: { $regex: safeKeywords, $options: "i" } },
        { content: { $regex: safeKeywords, $options: "i" } }
      ],
    };

    // 3. Simplified Personalization
    // (If the $and logic was too restrictive, this ensures results still show up)
    if (user?.interests?.length > 0) {
      query = {
        $and: [
          { $or: query.$or }, 
          { category: { $in: user.interests } }
        ]
      };
    }

    const results = await News.find(query).sort({ publishedAt: -1 }).limit(limit);
    
    // 4. Final Fallback: If search is too specific and returns 0, show general news
    if (results.length === 0) {
      return await News.find().sort({ publishedAt: -1 }).limit(5);
    }

    return results;
  } catch (error) {
    console.error("Database Search Error:", error);
    // Return something so the bot doesn't "error out"
    return await News.find().sort({ publishedAt: -1 }).limit(3);
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