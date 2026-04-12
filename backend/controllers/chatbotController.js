import Chatbot from "../models/Chatbot.js";
import { processChatbotQuery } from "../services/aiService.js";
import { v4 as uuidv4 } from 'uuid';

// ✅ START CHAT SESSION
export const startChatSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = uuidv4();

    // Create new chat session
    const chatSession = await Chatbot.create({
      userId,
      sessionId,
      messages: [{
        type: 'system',
        content: 'Hello! I\'m your AI news assistant. How can I help you today?',
        timestamp: new Date()
      }]
    });

    res.json({
      sessionId: chatSession.sessionId,
      message: chatSession.messages[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ SEND MESSAGE TO CHATBOT
export const sendMessage = async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    const userId = req.user.id;

    // Find or create chat session
    let chatSession = await Chatbot.findOne({ userId, sessionId, isActive: true });
    
    if (!chatSession) {
      // Create new session if not found
      chatSession = await Chatbot.create({
        userId,
        sessionId: sessionId || uuidv4(),
        messages: []
      });
    }

    // Add user message
    chatSession.messages.push({
      type: 'user',
      content: message,
      timestamp: new Date()
    });

    // Process query with AI
    const user = req.user;
    const aiResponse = await processChatbotQuery(message, user);

    // Add bot response
    const botMessage = {
      type: 'bot',
      content: aiResponse.response,
      timestamp: new Date(),
      metadata: {
        intent: aiResponse.intent,
        entities: aiResponse.searchKeywords,
        articlesShown: (aiResponse.articles || []).filter(a => a._id).map(a => a._id),
        confidence: 0.8
      }
    };

    chatSession.messages.push(botMessage);
    chatSession.lastActivity = new Date();
    await chatSession.save();

    res.json({
      message: botMessage,
      suggestedCategories: aiResponse.suggestedCategories,
      articles: aiResponse.articles,
      sessionId: chatSession.sessionId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET CHAT HISTORY
export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const chatSession = await Chatbot.findOne({ 
      userId, 
      sessionId, 
      isActive: true 
    }).populate('messages.metadata.articlesShown');

    if (!chatSession) {
      return res.status(404).json({ message: "Chat session not found" });
    }

    res.json({
      sessionId: chatSession.sessionId,
      messages: chatSession.messages,
      lastActivity: chatSession.lastActivity
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET ALL CHAT SESSIONS
export const getChatSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const sessions = await Chatbot.find({ userId, isActive: true })
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit)
      .select('sessionId lastActivity createdAt messages');

    const total = await Chatbot.countDocuments({ userId, isActive: true });
    const totalPages = Math.ceil(total / limit);

    res.json({
      sessions,
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

// ✅ END CHAT SESSION
export const endChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const chatSession = await Chatbot.findOneAndUpdate(
      { userId, sessionId, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!chatSession) {
      return res.status(404).json({ message: "Chat session not found" });
    }

    res.json({ message: "Chat session ended successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ CLEAR CHAT HISTORY
export const clearChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    await Chatbot.updateMany(
      { userId },
      { isActive: false }
    );

    res.json({ message: "Chat history cleared successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
