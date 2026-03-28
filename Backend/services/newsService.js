import axios from "axios";
import News from "../models/News.js";

// ✅ FETCH NEWS FROM EXTERNAL APIs
export const fetchNews = async (category = 'general', country = 'in', pageSize = 50) => {
  try {
    const url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=${pageSize}&apiKey=${process.env.NEWS_API_KEY}`;
    
    console.log("Fetching from:", url);
    const response = await axios.get(url);
    const articles = response.data.articles;

    return articles.map(article => ({
      title: article.title,
      content: article.content || article.description,
      summary: article.description,
      url: article.url,
      source: article.source.name,
      author: article.author,
      publishedAt: article.publishedAt,
      category: category === 'general' ? 'Top Headlines' : category.charAt(0).toUpperCase() + category.slice(1),
      imageUrl: article.urlToImage,
      externalId: article.url,
      language: 'en'
    }));
  } catch (error) {
    console.error("News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH GLOBAL NEWS
export const fetchGlobalNews = async () => {
  try {
    const url = `https://newsapi.org/v2/top-headlines?sources=bbc-news,cnn,reuters,associated-press&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    return response.data.articles;
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
    return response.data.articles;
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
    return response.data.articles;
  } catch (error) {
    console.error("Trending News API Error:", error.message);
    return [];
  }
};

// ✅ FETCH CATEGORY-WISE NEWS
export const fetchCategoryNews = async (category) => {
  const categoryMap = {
    'business': 'Finance',
    'technology': 'Technology',
    'entertainment': 'Entertainment',
    'sports': 'Sports',
    'science': 'Science',
    'health': 'Health'
  };

  const mappedCategory = categoryMap[category.toLowerCase()] || category;
  
  try {
    const url = `https://newsapi.org/v2/top-headlines?country=in&category=${category}&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    
    return response.data.articles.map(article => ({
      ...article,
      category: mappedCategory
    }));
  } catch (error) {
    console.error(`Category News API Error for ${category}:`, error.message);
    return [];
  }
};

// ✅ SAVE NEWS TO DATABASE
export const saveNewsToDatabase = async (articles) => {
  try {
    const savedNews = [];
    
    for (const article of articles) {
      // Check if article already exists
      const existingNews = await News.findOne({ url: article.url });
      if (!existingNews && article.title && article.content) {
        const newsItem = await News.create({
          ...article,
          publishedAt: new Date(article.publishedAt),
          readTime: Math.ceil((article.content || '').length / 1000) || 5
        });
        savedNews.push(newsItem);
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
    let query = 'local';
    if (city) query += ` ${city}`;
    if (state) query += ` ${state}`;
    
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    
    return response.data.articles.map(article => ({
      ...article,
      category: 'Local',
      location: {
        country: 'India',
        state: state || '',
        city: city || ''
      }
    }));
  } catch (error) {
    console.error("Local News API Error:", error.message);
    return [];
  }
};

// ✅ GET GOOD NEWS
export const getGoodNews = async () => {
  try {
    const positiveKeywords = ['good news', 'positive', 'inspiring', 'achievement', 'success', 'breakthrough', 'milestone'];
    const query = positiveKeywords.join(' OR ');
    
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    
    return response.data.articles.map(article => ({
      ...article,
      category: 'Good News',
      sentiment: 'positive'
    }));
  } catch (error) {
    console.error("Good News API Error:", error.message);
    return [];
  }
};