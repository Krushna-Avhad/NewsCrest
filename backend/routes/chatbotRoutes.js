import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  startChatSession,
  sendMessage,
  getChatHistory,
  getChatSessions,
  endChatSession,
  clearChatHistory
} from "../controllers/chatbotController.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ✅ Start new chat session
router.post("/start", startChatSession);

// ✅ Send message to chatbot
router.post("/message", sendMessage);

// ✅ Get chat history for a session
router.get("/history/:sessionId", getChatHistory);

// ✅ Get all chat sessions for user
router.get("/sessions", getChatSessions);

// ✅ End chat session
router.delete("/session/:sessionId", endChatSession);

// ✅ Clear all chat history
router.delete("/clear", clearChatHistory);

export default router;
