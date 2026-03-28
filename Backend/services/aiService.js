import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import News from "../models/News.js";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ SUMMARIZE NEWS
export const summarizeNews = async (text) => {
  try {
    const cleanText = (text || "No content").substring(0, 1000);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Summarize this news in 2-3 simple lines:\n${cleanText}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text() || "Summary not available";
  } catch (error) {
    console.error("AI Summary Error:", error);
    return "Summary not available";
  }
};

// ✅ GENERATE HATKE (FUNNY) SUMMARY
export const generateHatkeSummary = async (title, content) => {
  try {
    const cleanText = `${title}\n${(content || "").substring(0, 800)}`;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Convert this serious news into a funny, witty, short summary in 1-2 lines. Keep it light-hearted but informative. Don't be offensive:\n${cleanText}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text() || "Hatke summary not available";
  } catch (error) {
    console.error("Hatke Summary Error:", error);
    return "Hatke summary not available";
  }
};

// ✅ EXPLAIN IN SIMPLE LANGUAGE
export const explainSimply = async (title, content) => {
  try {
    const cleanText = `${title}\n${(content || "").substring(0, 1000)}`;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Explain this news in very simple language that anyone can understand. Use simple words and short sentences:\n${cleanText}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text() || "Simple explanation not available";
  } catch (error) {
    console.error("Simple Explanation Error:", error);
    return "Simple explanation not available";
  }
};

// ✅ CHATBOT QUERY PROCESSING
export const processChatbotQuery = async (query, user) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Build context about user
    const userContext = user ? {
      profileType: user.profileType,
      interests: user.interests,
      location: `${user.city}, ${user.state}`
    } : {};

    const prompt = `You are a helpful news assistant. Based on the user's query, provide relevant news information and suggest article categories. 
    
User Query: ${query}
User Profile: ${JSON.stringify(userContext)}

Respond in this JSON format:
{
  "intent": "search|category|latest|explain",
  "response": "Your response to the user",
  "suggestedCategories": ["category1", "category2"],
  "searchKeywords": ["keyword1", "keyword2"],
  "articles": []
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(response.text());
    } catch (e) {
      aiResponse = {
        intent: "search",
        response: response.text(),
        suggestedCategories: [],
        searchKeywords: [query],
        articles: []
      };
    }

    // If search intent, find relevant articles
    if (aiResponse.intent === "search" && aiResponse.searchKeywords.length > 0) {
      const articles = await searchNews(aiResponse.searchKeywords.join(" "), user);
      aiResponse.articles = articles;
    }

    return aiResponse;
  } catch (error) {
    console.error("Chatbot Error:", error);
    return {
      intent: "search",
      response: "I can help you find news. Try asking about specific topics or categories!",
      suggestedCategories: ["Technology", "Business", "Health"],
      searchKeywords: [query],
      articles: []
    };
  }
};

// ✅ COMPARE TWO NEWS ITEMS
export const compareNews = async (item1, item2) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Compare these two news items and provide a detailed analysis:

Item 1:
Title: ${item1.title || item1}
Content: ${item1.content || ""}

Item 2:
Title: ${item2.title || item2}
Content: ${item2.content || ""}

Provide a detailed comparison in this JSON format:
{
  "similarities": [
    {"aspect": "topic", "description": "Similar topic", "confidence": 0.8}
  ],
  "differences": [
    {"aspect": "perspective", "description": "Different viewpoint", "confidence": 0.7}
  ],
  "insights": [
    {"type": "key_takeaway", "content": "Main insight", "importance": "high"}
  ],
  "overallScore": 0.75,
  "sentiment": {
    "item1": "positive",
    "item2": "neutral",
    "comparison": "item1_more_positive"
  }
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    try {
      return JSON.parse(response.text());
    } catch (e) {
      return {
        similarities: [{ aspect: "general", description: "Both discuss current events", confidence: 0.5 }],
        differences: [{ aspect: "focus", description: "Different angles on similar topics", confidence: 0.5 }],
        insights: [{ type: "general", content: "Both items provide valuable information", importance: "medium" }],
        overallScore: 0.5,
        sentiment: { item1: "neutral", item2: "neutral", comparison: "similar" }
      };
    }
  } catch (error) {
    console.error("Comparison Error:", error);
    throw new Error("Failed to compare news items");
  }
};

// ✅ SEARCH NEWS BASED ON KEYWORDS
export const searchNews = async (keywords, user) => {
  try {
    const limit = 10;
    let query = {
      $or: [
        { title: { $regex: keywords, $options: 'i' } },
        { content: { $regex: keywords, $options: 'i' } },
        { tags: { $in: [new RegExp(keywords, 'i')] } }
      ]
    };

    // Add personalization if user is available
    if (user && user.interests && user.interests.length > 0) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { category: { $in: user.interests } },
          { tags: { $in: user.interests } }
        ]
      });
    }

    const articles = await News.find(query)
      .sort({ publishedAt: -1, trending: -1 })
      .limit(limit);

    return articles;
  } catch (error) {
    console.error("Search Error:", error);
    return [];
  }
};

// ✅ ADVANCED NEWS FILTERING
export const filterNewsAdvanced = (news, user) => {
  if (!user || !user.interests || user.interests.length === 0) return news;

  return news.filter((item) => {
    const text = `${item.title || ""} ${item.description || ""} ${item.content || ""}`.toLowerCase();

    return user.interests.some((interest) =>
      text.includes(interest.toLowerCase())
    );
  });
};

// ✅ GET RECOMMENDATIONS BASED ON READING HISTORY
export const getRecommendations = async (userId) => {
  try {
    const User = require("../models/User.js").default;
    const user = await User.findById(userId).populate('readingHistory.articleId');
    
    if (!user || !user.readingHistory.length) {
      return await News.find().sort({ trending: -1 }).limit(10);
    }

    // Extract categories from reading history
    const readCategories = user.readingHistory.map(h => h.articleId?.category).filter(Boolean);
    const categoryFrequency = {};
    
    readCategories.forEach(cat => {
      categoryFrequency[cat] = (categoryFrequency[cat] || 0) + 1;
    });

    // Get top categories
    const topCategories = Object.entries(categoryFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => cat);

    // Find similar articles
    const recommendations = await News.find({
      category: { $in: topCategories },
      _id: { $nin: user.readingHistory.map(h => h.articleId._id) }
    })
    .sort({ publishedAt: -1, trending: -1 })
    .limit(10);

    return recommendations;
  } catch (error) {
    console.error("Recommendations Error:", error);
    return await News.find().sort({ trending: -1 }).limit(10);
  }
};