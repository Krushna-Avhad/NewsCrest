// services/compareService.js
import axios from "axios";
import { summarizeNews } from "./aiService.js";

export const compareNews = async (url1, url2) => {
  const res1 = await axios.get(url1);
  const res2 = await axios.get(url2);

  const text1 = res1.data;
  const text2 = res2.data;

  const combined = `
  Compare these two news articles and give a balanced conclusion:

  Article 1: ${text1}
  Article 2: ${text2}
  `;

  const summary = await summarizeNews(combined);

  return summary;
};