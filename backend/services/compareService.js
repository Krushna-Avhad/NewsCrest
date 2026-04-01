import axios from "axios";
import { summarizeNews } from "./aiService.js";

export const compareNews = async (url1, url2) => {
  try {
    const res1 = await axios.get(url1);
    const res2 = await axios.get(url2);

    // 🔥 CLEAN HTML + LIMIT TEXT
    const text1 = res1.data.replace(/<[^>]*>?/gm, "").substring(0, 800);
    const text2 = res2.data.replace(/<[^>]*>?/gm, "").substring(0, 800);

    const combined = `
    Compare these two news articles in 3 simple lines:

    Article 1: ${text1}
    Article 2: ${text2}
    `;

    const summary = await summarizeNews(combined);

    return summary;

  } catch (error) {
    console.error("COMPARE ERROR FULL:", error);
    return "Comparison failed";
  }
};