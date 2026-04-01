import axios from "axios";
import News from "../models/News.js";

// ✅ FETCH NEWS FROM EXTERNAL APIs
export const fetchNews = async (
  category = "general",
  country = "in",
  pageSize = 50,
) => {
  try {
    const url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=${pageSize}&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    const articles = response.data.articles;

    return articles
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((article) => ({
        title: article.title,
        // ✅ FIX: Use description as content fallback — NewsAPI truncates content
        content: article.content || article.description || article.title,
        summary: article.description || article.title,
        url: article.url,
        source: article.source?.name || "Unknown",
        author: article.author || "",
        publishedAt: article.publishedAt,
        category: mapCategory(category),
        imageUrl: article.urlToImage || "",
        externalId: article.url,
        language: "en",
      }));
  } catch (error) {
    console.error("News API Error:", error.message);
    return [];
  }
};

// Map NewsAPI category names to our app category names
function mapCategory(category) {
  const map = {
    general: "Top Headlines",
    technology: "Technology",
    business: "Business",
    entertainment: "Entertainment",
    health: "Health",
    science: "Science",
    sports: "Sports",
  };
  return map[category.toLowerCase()] || "Top Headlines";
}

// ✅ FETCH GLOBAL NEWS
export const fetchGlobalNews = async () => {
  try {
    const url = `https://newsapi.org/v2/top-headlines?sources=bbc-news,cnn,reuters&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    return response.data.articles || [];
  } catch (error) {
    console.error("Global News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH INDIA NEWS
export const fetchIndiaNews = async () => {
  try {
    const url = `https://newsapi.org/v2/top-headlines?country=in&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    return response.data.articles || [];
  } catch (error) {
    console.error("India News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH TRENDING NEWS
export const fetchTrendingNews = async () => {
  try {
    const url = `https://newsapi.org/v2/everything?q=trending&sortBy=popularity&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    return response.data.articles || [];
  } catch (error) {
    console.error("Trending News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH CATEGORY-WISE NEWS
export const fetchCategoryNews = async (category) => {
  try {
    const url = `https://newsapi.org/v2/top-headlines?country=in&category=${category}&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    return (response.data.articles || [])
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((article) => ({
        title: article.title,
        content: article.content || article.description || article.title,
        summary: article.description || article.title,
        url: article.url,
        source: article.source?.name || "Unknown",
        author: article.author || "",
        publishedAt: article.publishedAt,
        imageUrl: article.urlToImage || "",
        externalId: article.url,
      }));
  } catch (error) {
    console.error("Category News Error:", error.message);
    return [];
  }
};

// ✅ SAVE NEWS TO DATABASE
// ✅ FIX: Accept articles with description even if content is null/truncated
export const saveNewsToDatabase = async (articles) => {
  try {
    const savedNews = [];
    for (const article of articles) {
      // Skip if no title or URL (minimum required fields)
      if (!article.title || !article.url || article.title === "[Removed]")
        continue;

      // Check duplicate by URL
      const exists = await News.findOne({ url: article.url });
      if (exists) continue;

      // Use description as content if content is empty/truncated
      const content =
        article.content ||
        article.summary ||
        article.description ||
        article.title;

      try {
        const newsItem = await News.create({
          ...article,
          content,
          summary: article.summary || article.description || "",
          publishedAt: new Date(article.publishedAt || Date.now()),
          readTime: Math.ceil(content.length / 1000) || 3,
          trending: false,
          importance: "medium",
          sentiment: "neutral",
        });
        savedNews.push(newsItem);
      } catch (err) {
        // Skip individual article errors (e.g. validation)
        console.warn(`  Skipped article: ${err.message}`);
      }
    }
    return savedNews;
  } catch (error) {
    console.error("Error saving news to database:", error.message);
    return [];
  }
};

// ✅ GET LOCAL NEWS BASED ON USER LOCATION
export const getLocalNews = async (city, state) => {
  try {
    let query = "India";
    if (city) query += ` ${city}`;
    if (state) query += ` ${state}`;
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    return (response.data.articles || [])
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((article) => ({
        title: article.title,
        content: article.content || article.description || article.title,
        summary: article.description || "",
        url: article.url,
        source: article.source?.name || "Unknown",
        author: article.author || "",
        publishedAt: article.publishedAt,
        imageUrl: article.urlToImage || "",
        category: "Local",
        location: { city, state, country: "India" },
      }));
  } catch (error) {
    console.error("Local News Error:", error.message);
    return [];
  }
};
