// controllers/alertController.js
import { fetchNews } from "../services/newsService.js";
import { getPriority } from "../utils/priorityHelper.js";
import { sendAlertEmail } from "../services/emailService.js";
import User from "../models/User.js";

export const checkAlerts = async (req, res) => {
  const user = await User.findById(req.user.id);

  const news = await fetchNews();

  const alerts = [];

  for (let item of news) {
    const priority = getPriority(item.title);

    if (priority === "HIGH") {
      alerts.push(item);

      await sendAlertEmail(user.email, item.title);
    }
  }

  res.json(alerts);
};