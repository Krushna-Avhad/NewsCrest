// controllers/newsController.js
import { fetchNews } from "../services/newsService.js";
import { summarizeNews, filterNewsAdvanced } from "../services/aiService.js";
import User from "../models/User.js";

export const getMyFeed = async (req, res) => {
  try {
    // 1. Get logged-in user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Fetch news (from News API)
    const news = await fetchNews();

    if (!news || news.length === 0) {
      return res.status(404).json({ error: "No news found" });
    }

    // 3. Filter news based on user interests
    const filtered = filterNewsAdvanced(news, user);

    // 4. If no match, fallback to top news
    const newsToProcess = filtered.length > 0 ? filtered : news;

    // 5. Limit to avoid API overload (VERY IMPORTANT)
    const limitedNews = newsToProcess.slice(0, 10);

    // 6. Summarize using AI
    const summarized = await Promise.all(
      limitedNews.map(async (item) => {
        const text = item.content || item.description || item.title;

        const summary = await summarizeNews(text);

        return {
          title: item.title,
          summary,
          source: item.source?.name,
          url: item.url,
          image: item.urlToImage,
          publishedAt: item.publishedAt,
        };
      })
    );

    // 7. Send response
    res.json(summarized);

  } catch (err) {
    console.error("Feed Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};