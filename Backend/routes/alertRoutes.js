import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getUserAlerts,
  getUnreadAlertsCount,
  markAlertAsRead,
  markAllAlertsAsRead,
  deleteAlert,
  clearAllAlerts,
  createCustomAlert,
  getAlertStatistics,
  triggerBreakingNewsAlerts,
  triggerPersonalizedAlerts,
  triggerDailyDigest
} from "../controllers/alertController.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user alerts
router.get("/", getUserAlerts);

// Get unread alerts count
router.get("/unread-count", getUnreadAlertsCount);

// Mark alert as read
router.put("/:alertId/read", markAlertAsRead);

// Mark all alerts as read
router.put("/read-all", markAllAlertsAsRead);

// Delete alert
router.delete("/:alertId", deleteAlert);

// Clear all alerts
router.delete("/clear", clearAllAlerts);

// Create custom alert
router.post("/create", createCustomAlert);

// Get alert statistics
router.get("/statistics", getAlertStatistics);

// Admin routes (you can add admin middleware later)
router.post("/trigger-breaking", triggerBreakingNewsAlerts);
router.post("/trigger-personalized", triggerPersonalizedAlerts);
router.post("/trigger-digest", triggerDailyDigest);

export default router;