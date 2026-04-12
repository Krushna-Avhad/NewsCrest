// controllers/userController.js
import User from "../models/User.js";

export const saveNews = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user.savedArticles.includes(req.body.articleId)) { user.savedArticles.push(req.body.articleId); }

  await user.save();

  res.json({ message: "Saved" });
};

export const getSavedNews = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user.savedArticles);
};