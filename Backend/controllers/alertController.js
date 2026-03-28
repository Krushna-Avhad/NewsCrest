// controllers/alertController.js
import { fetchNews } from "../services/newsService.js";
import { getPriority } from "../utils/priorityHelper.js";
import { sendAlertEmail } from "../services/emailService.js";
import Alert from "../models/Alert.js";
import { 
  createAlert, 
  processBreakingNewsAlerts, 
  processPersonalizedAlerts, 
  processDailyDigest 
} from "../services/notificationService.js";
import News from "../models/News.js";
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

// ✅ GET USER ALERTS
export const getUserAlerts = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { type, isRead } = req.query;

    let query = { userId };
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const alerts = await Alert.find(query)
      .populate('articleId', 'title source publishedAt imageUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Alert.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET UNREAD ALERTS COUNT
export const getUnreadAlertsCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await Alert.countDocuments({ userId, isRead: false });

    res.json({ unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ MARK ALERT AS READ
export const markAlertAsRead = async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.user.id;

    const alert = await Alert.findOneAndUpdate(
      { _id: alertId, userId },
      { isRead: true },
      { new: true }
    ).populate('articleId');

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.json({ 
      message: "Alert marked as read",
      alert 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ MARK ALL ALERTS AS READ
export const markAllAlertsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Alert.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: "All alerts marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ DELETE ALERT
export const deleteAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.user.id;

    const alert = await Alert.findOneAndDelete({ _id: alertId, userId });

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.json({ message: "Alert deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ CLEAR ALL ALERTS
export const clearAllAlerts = async (req, res) => {
  try {
    const userId = req.user.id;

    await Alert.deleteMany({ userId });

    res.json({ message: "All alerts cleared successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ CREATE CUSTOM ALERT
export const createCustomAlert = async (req, res) => {
  try {
    const { articleId, type, priority } = req.body;
    const userId = req.user.id;

    // Validate article exists
    const article = await News.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const alert = await createAlert(userId, articleId, type, priority);

    if (!alert) {
      return res.status(400).json({ message: "Failed to create alert" });
    }

    res.status(201).json({
      message: "Alert created successfully",
      alert
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET ALERT STATISTICS
export const getAlertStatistics = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Alert.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
          emailSent: { $sum: { $cond: ['$isEmailSent', 1, 0] } }
        }
      }
    ]);

    const totalAlerts = await Alert.countDocuments({ userId });
    const unreadAlerts = await Alert.countDocuments({ userId, isRead: false });

    res.json({
      totalAlerts,
      unreadAlerts,
      readAlerts: totalAlerts - unreadAlerts,
      statsByType: stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ TRIGGER BREAKING NEWS ALERTS (Admin only)
export const triggerBreakingNewsAlerts = async (req, res) => {
  try {
    await processBreakingNewsAlerts();
    res.json({ message: "Breaking news alerts processed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ TRIGGER PERSONALIZED ALERTS (Admin only)
export const triggerPersonalizedAlerts = async (req, res) => {
  try {
    await processPersonalizedAlerts();
    res.json({ message: "Personalized alerts processed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ TRIGGER DAILY DIGEST (Admin only)
export const triggerDailyDigest = async (req, res) => {
  try {
    await processDailyDigest();
    res.json({ message: "Daily digest processed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};