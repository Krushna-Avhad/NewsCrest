import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
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
} from '../controllers/alertController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Specific named routes MUST come before /:alertId to avoid param shadowing
router.get('/', getUserAlerts);
router.get('/unread-count', getUnreadAlertsCount);
router.get('/statistics', getAlertStatistics);
router.put('/read-all', markAllAlertsAsRead);
router.delete('/clear', clearAllAlerts);
router.post('/create', createCustomAlert);
router.post('/trigger-breaking', triggerBreakingNewsAlerts);
router.post('/trigger-personalized', triggerPersonalizedAlerts);
router.post('/trigger-digest', triggerDailyDigest);

// Param routes last
router.put('/:alertId/read', markAlertAsRead);
router.delete('/:alertId', deleteAlert);

export default router;
