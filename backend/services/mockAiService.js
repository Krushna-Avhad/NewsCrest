// Mock AI Service for testing Hatke features
import dotenv from "dotenv";
dotenv.config();

// ✅ MOCK SUMMARIZE NEWS
export const summarizeNews = async (text) => {
  try {
    const cleanText = (text || "No content").substring(0, 1000);
    
    // Simple mock summary based on content
    if (cleanText.toLowerCase().includes('ai') || cleanText.toLowerCase().includes('artificial intelligence')) {
      return "AI technology is advancing rapidly with new breakthrough applications in various industries.";
    } else if (cleanText.toLowerCase().includes('climate') || cleanText.toLowerCase().includes('environment')) {
      return "Environmental concerns continue to drive global discussions on climate action and sustainability.";
    } else if (cleanText.toLowerCase().includes('space') || cleanText.toLowerCase().includes('mars')) {
      return "Space exploration is reaching new heights with ambitious plans for interplanetary missions.";
    } else {
      return "This news covers important developments that are shaping current events and future trends.";
    }
  } catch (error) {
    console.error("Mock Summary Error:", error);
    return "Summary not available";
  }
};

// ✅ MOCK GENERATE HATKE (FUNNY) SUMMARY
export const generateHatkeSummary = async (title, content) => {
  try {
    const cleanText = `${title}\n${(content || "").substring(0, 800)}`;
    
    // Mock funny summaries based on content
    if (cleanText.toLowerCase().includes('ai') || cleanText.toLowerCase().includes('healthcare')) {
      return "AI doctors are coming! Soon your cough will be diagnosed by an algorithm that's seen more cat videos than WebMD.";
    } else if (cleanText.toLowerCase().includes('climate') || cleanText.toLowerCase().includes('summit')) {
      return "World leaders finally agreed on something! Now if they could just agree on who's paying for the pizza.";
    } else if (cleanText.toLowerCase().includes('space') || cleanText.toLowerCase().includes('mars')) {
      return "Humans going to Mars! Because ruining Earth wasn't enough, now we need a backup planet.";
    } else {
      return "In other news, something happened somewhere. People had opinions. The internet was surprised.";
    }
  } catch (error) {
    console.error("Mock Hatke Summary Error:", error);
    return "Hatke summary not available";
  }
};

// ✅ MOCK EXPLAIN IN SIMPLE LANGUAGE
export const explainSimply = async (title, content) => {
  try {
    const cleanText = `${title}\n${(content || "").substring(0, 1000)}`;
    
    // Mock simple explanations
    if (cleanText.toLowerCase().includes('ai') || cleanText.toLowerCase().includes('healthcare')) {
      return "Smart computers are helping doctors find sickness faster and make better treatments for people.";
    } else if (cleanText.toLowerCase().includes('climate') || cleanText.toLowerCase().includes('summit')) {
      return "Countries got together to promise they'll stop making the Earth too hot by using cleaner energy.";
    } else if (cleanText.toLowerCase().includes('space') || cleanText.toLowerCase().includes('mars')) {
      return "People want to visit Mars to live there, like moving to a very, very, very far away neighborhood.";
    } else {
      return "Something important happened that affects many people, and here's what you need to know about it.";
    }
  } catch (error) {
    console.error("Mock Simple Explanation Error:", error);
    return "Simple explanation not available";
  }
};

// ✅ MOCK CHATBOT QUERY PROCESSING
export const processChatbotQuery = async (query, user) => {
  try {
    // Simple mock responses
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('tech') || lowerQuery.includes('technology')) {
      return {
        intent: "category",
        response: "I can help you find the latest technology news! Check out our AI, gadgets, and innovation updates.",
        suggestedCategories: ["Technology", "Science", "Business"],
        searchKeywords: ["technology", "AI", "innovation"],
        articles: []
      };
    } else if (lowerQuery.includes('climate') || lowerQuery.includes('environment')) {
      return {
        intent: "category",
        response: "Stay updated on environmental news and climate action from around the world.",
        suggestedCategories: ["Environment", "World", "Science"],
        searchKeywords: ["climate", "environment", "sustainability"],
        articles: []
      };
    } else {
      return {
        intent: "search",
        response: "I can help you find news on any topic. Try searching for specific keywords or browse by category!",
        suggestedCategories: ["Technology", "Business", "Health", "World"],
        searchKeywords: [query],
        articles: []
      };
    }
  } catch (error) {
    console.error("Mock Chatbot Error:", error);
    return {
      intent: "search",
      response: "I can help you find news. Try asking about specific topics or categories!",
      suggestedCategories: ["Technology", "Business", "Health"],
      searchKeywords: [query],
      articles: []
    };
  }
};

// ✅ MOCK COMPARE TWO NEWS ITEMS
export const compareNews = async (item1, item2) => {
  try {
    // Mock comparison
    return {
      similarities: [
        { aspect: "topic", description: "Both discuss current events and developments", confidence: 0.7 }
      ],
      differences: [
        { aspect: "focus", description: "Different angles and perspectives on related topics", confidence: 0.6 }
      ],
      insights: [
        { type: "key_takeaway", content: "Both articles provide valuable information on important topics", importance: "medium" }
      ],
      overallScore: 0.65,
      sentiment: { 
        item1: "positive", 
        item2: "positive", 
        comparison: "similar_sentiment" 
      }
    };
  } catch (error) {
    console.error("Mock Comparison Error:", error);
    throw new Error("Failed to compare news items");
  }
};

// ✅ SEARCH NEWS BASED ON KEYWORDS
export const searchNews = async (keywords, user) => {
  try {
    // Import News model dynamically
    const News = (await import("../models/News.js")).default;
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
    const User = (await import("../models/User.js")).default;
    const News = (await import("../models/News.js")).default;
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
    const News = (await import("../models/News.js")).default;
    return await News.find().sort({ trending: -1 }).limit(10);
  }
};

console.log("Mock AI Service loaded - Using mock responses for testing");
