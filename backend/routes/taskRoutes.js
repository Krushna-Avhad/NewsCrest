import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createTask,
  createNoteFromArticle,
  getTasks,
  getTask,
  updateTask,
  toggleTaskCompletion,
  togglePinStatus,
  deleteTask,
  getTasksByType,
  getUpcomingDeadlines,
  getTaskStatistics
} from '../controllers/taskController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Specific GET routes MUST come before /:taskId to avoid param shadowing
router.get('/type/:type', getTasksByType);
router.get('/deadlines', getUpcomingDeadlines);
router.get('/statistics', getTaskStatistics);

// Collection routes
router.post('/', createTask);
router.post('/article/:articleId/note', createNoteFromArticle);
router.get('/', getTasks);

// Param routes (must be last for GET/PUT/DELETE)
router.get('/:taskId', getTask);
router.put('/:taskId', updateTask);
router.put('/:taskId/toggle', toggleTaskCompletion);
router.put('/:taskId/pin', togglePinStatus);
router.delete('/:taskId', deleteTask);

export default router;