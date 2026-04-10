import { factCheck } from "../services/factCheckService.js";

export const verifyNews = async (req, res) => {
  try {
    const result = await factCheck(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};