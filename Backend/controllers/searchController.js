// controllers/searchController.js
import { compareNews } from "../services/compareService.js";

export const compareHandler = async (req, res) => {
  const { url1, url2 } = req.body;

  const result = await compareNews(url1, url2);

  res.json({ result });
};