// services/newsService.js

export const fetchNews = async () => {
  try {
    const url = `https://newsapi.org/v2/top-headlines?country=in&apiKey=${process.env.NEWS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    return data.articles;
  } catch (error) {
    console.error("News API Error:", error.message);
    return [];
  }
};