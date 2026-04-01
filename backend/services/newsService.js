import axios from "axios";
import News from "../models/News.js";

// ── Newsdata.io response → internal article shape ────────────────────────────
// Newsdata.io fields: title, description, content, link, source_name, creator,
//                     pubDate, category (array), image_url, country (array)
function mapNewsdataArticle(article, categoryOverride) {
  const category = categoryOverride || mapCategory(article.category?.[0] || "top");
  return {
    title: article.title || "",
    content: article.content || article.description || article.title || "",
    summary: article.description || article.title || "",
    url: article.link || "",
    source: article.source_name || "Unknown",
    author: Array.isArray(article.creator) ? article.creator[0] : (article.creator || ""),
    publishedAt: article.pubDate || new Date().toISOString(),
    category,
    imageUrl: article.image_url || "",
    externalId: article.link || "",
    language: article.language || "en",
  };
}

// Map Newsdata.io category names to our app category names
function mapCategory(category) {
  const map = {
    top: "Top Headlines",
    technology: "Technology",
    //business: "Business",
    business: "Finance",
    finance: "Finance",
    politics: "Politics",
    education: "Education",
    entertainment: "Entertainment",
    health: "Health",
    science: "Science",
    "fashion": "Fashion",
    "fasion": "Fashion",
    sports: "Sports",
    //india: "India", 
    world: "World",
    general: "Top Headlines",
  };
  return map[(category || "").toLowerCase()] || "Top Headlines";
}


export const fetchAllCategories = async () => {
  const categoriesToFetch = [
    "top", "technology", "business", "sports", "fashion",
    "health", "science", "entertainment", "politics", "education", "world"
  ];
  
  try {
    const requests = categoriesToFetch.map(cat => 
      axios.get(`https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&country=in&category=${cat}&language=en`)
        .then(res => (res.data.results || []).map(a => mapNewsdataArticle(a, mapCategory(cat))))
        .catch(err => {
          console.error(`Error fetching ${cat}:`, err.message);
          return [];
        })
    );

    const results = await Promise.all(requests);
    // Flatten the array of arrays into one single list
    return results.flat();
  } catch (error) {
    console.error("Critical Fetch Error:", error.message);
    return [];
  }
};


// ✅ FETCH NEWS FROM NEWSDATA.IO
export const fetchNews = async (
  category = "top",
  country = "in",
  pageSize = 10,   // Newsdata.io free tier max is 10 per request
) => {
  try {
    // Newsdata.io uses "top" instead of "general"
    const cat = category === "general" ? "top" : category;
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&country=${country}&category=${cat}&language=en`;
    const response = await axios.get(url);
    const articles = response.data.results || [];

    return articles
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((a) => mapNewsdataArticle(a, mapCategory(cat)));
  } catch (error) {
    console.error("News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH GLOBAL NEWS
export const fetchGlobalNews = async () => {
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&language=en&category=top`;
    const response = await axios.get(url);
    return (response.data.results || []).map((a) => mapNewsdataArticle(a));
  } catch (error) {
    console.error("Global News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH INDIA NEWS
export const fetchIndiaNews = async () => {
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&country=in&language=en`;
    const response = await axios.get(url);
    return (response.data.results || []).map((a) => mapNewsdataArticle(a));
  } catch (error) {
    console.error("India News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH TRENDING NEWS
export const fetchTrendingNews = async () => {
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&language=en&category=top&country=in,us`;
    const response = await axios.get(url);
    return (response.data.results || []).map((a) => mapNewsdataArticle(a));
  } catch (error) {
    console.error("Trending News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH CATEGORY-WISE NEWS
export const fetchCategoryNews = async (category) => {
  try {
    const cat = category === "general" ? "top" : category;
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&country=in&language=en&category=${cat}`;
    const response = await axios.get(url);
    return (response.data.results || [])
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((a) => mapNewsdataArticle(a, mapCategory(cat)));
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
    const url = `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&q=${encodeURIComponent(query)}&country=in&language=en`;
    const response = await axios.get(url);
    return (response.data.results || [])
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((article) => ({
        title: article.title,
        content: article.content || article.description || article.title,
        summary: article.description || "",
        url: article.link || "",
        source: article.source_name || "Unknown",
        author: Array.isArray(article.creator) ? article.creator[0] : (article.creator || ""),
        publishedAt: article.pubDate || new Date().toISOString(),
        imageUrl: article.image_url || "",
        category: "Local",
        location: { city, state, country: "India" },
      }));
  } catch (error) {
    console.error("Local News Error:", error.message);
    return [];
  }
};
