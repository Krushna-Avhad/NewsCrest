// controllers/alertController.js
import mongoose from "mongoose";
import Alert from "../models/Alert.js";
import News  from "../models/News.js";
import User  from "../models/User.js";
import {
  createAlert,
  processBreakingNewsAlerts,
  processPersonalizedAlerts,
  processDailyDigest,
} from "../services/notificationService.js";

// ── GET USER ALERTS ───────────────────────────────────────────────────────────
export const getUserAlerts = async (req, res) => {
  try {
    const userId = req.user.id;
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const skip   = (page - 1) * limit;
    const { type, isRead } = req.query;
//filtering alert
    const query = { userId };
    if (type)             query.type   = type;
    if (isRead !== undefined) query.isRead = isRead === "true";

    const alerts = await Alert.find(query)
      .populate("articleId", "title source publishedAt imageUrl url category")  //attach article data
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total      = await Alert.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      alerts,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET UNREAD COUNT ──────────────────────────────────────────────────────────
export const getUnreadAlertsCount = async (req, res) => {
  try {
    const unreadCount = await Alert.countDocuments({ userId: req.user.id, isRead: false });
    res.json({ unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── MARK AS READ ──────────────────────────────────────────────────────────────
export const markAlertAsRead = async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.alertId, userId: req.user.id },//mark one as read
      { isRead: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: "Alert not found" });
    res.json({ message: "Alert marked as read", alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── MARK ALL READ ─────────────────────────────────────────────────────────────
export const markAllAlertsAsRead = async (req, res) => {
  try {
    await Alert.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: "All alerts marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE ALERT ──────────────────────────────────────────────────────────────
export const deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({ _id: req.params.alertId, userId: req.user.id });//key code
    if (!alert) return res.status(404).json({ message: "Alert not found" });
    res.json({ message: "Alert deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── CLEAR ALL ─────────────────────────────────────────────────────────────────
export const clearAllAlerts = async (req, res) => {
  try {
    await Alert.deleteMany({ userId: req.user.id });//delete all alert
    res.json({ message: "All alerts cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── CREATE CUSTOM ALERT ───────────────────────────────────────────────────────
export const createCustomAlert = async (req, res) => {
  try {
    const { articleId, type, priority } = req.body;
    const article = await News.findById(articleId);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const alert = await createAlert(req.user.id, articleId, type, priority);
    if (!alert)  return res.status(400).json({ message: "Failed to create alert" });

    res.status(201).json({ message: "Alert created", alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── STATISTICS ────────────────────────────────────────────────────────────────
export const getAlertStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats  = await Alert.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: {
          _id:       "$type",
          total:     { $sum: 1 },
          unread:    { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
          //{ $eq: ["$isRead", false] } =>is isRead === false ?
          emailSent: { $sum: { $cond: ["$isEmailSent", 1, 0] } },
      }},
    ]);

    const totalAlerts  = await Alert.countDocuments({ userId });
    const unreadAlerts = await Alert.countDocuments({ userId, isRead: false });

    res.json({ totalAlerts, unreadAlerts, readAlerts: totalAlerts - unreadAlerts, statsByType: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── TRIGGER CRON JOBS MANUALLY (for testing) ─────────────────────────────────
export const triggerBreakingNewsAlerts = async (req, res) => {
  try {
    await processBreakingNewsAlerts();
    res.json({ message: "Breaking news alerts processed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const triggerPersonalizedAlerts = async (req, res) => {
  try {
    await processPersonalizedAlerts();
    res.json({ message: "Personalized alerts processed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const triggerDailyDigest = async (req, res) => {
  try {
    await processDailyDigest();
    res.json({ message: "Daily digest processed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
