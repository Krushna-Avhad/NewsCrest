// services/aiService.js

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Summarize News
export const summarizeNews = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const result = await model.generateContent(
      `Summarize this news in 2-3 lines:\n${text || "No content"}`
    );

    return result.response.text();
  } catch (error) {
    console.error("AI Error:", error.message);
    return "Summary not available";
  }
};

// ✅ Filter News
export const filterNewsAdvanced = (news, user) => {
  if (!user || !user.interests) return news;

  return news.filter((item) => {
    const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();

    return user.interests.some((interest) =>
      text.includes(interest.toLowerCase())
    );
  });
};