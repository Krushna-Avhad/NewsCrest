// controllers/newsController.js
import { fetchNews } from "../services/newsService.js";
import { summarizeNews, filterNewsAdvanced } from "../services/aiService.js";
import User from "../models/User.js";

export const getMyFeed = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const news = await fetchNews();

    const filtered = filterNewsAdvanced(news, user);

    const summarized = await Promise.all(
      filtered.slice(0, 10).map(async (item) => {
        const summary = await summarizeNews(item.description || item.title);
        return { ...item, summary };
      })
    );

    res.json(summarized);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};