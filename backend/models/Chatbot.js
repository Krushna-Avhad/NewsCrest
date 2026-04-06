import mongoose from "mongoose";

const chatbotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true },
  messages: [{
    type: { 
      type: String, 
      enum: ['user', 'bot', 'system'],
      required: true 
    },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    metadata: {
      intent: String,
      entities: [String],
      articlesShown: [{ type: mongoose.Schema.Types.ObjectId, ref: 'News' }],
      confidence: Number
    }
  }],
  isActive: { type: Boolean, default: true },
  lastActivity: { type: Date, default: Date.now }
}, { timestamps: true });

chatbotSchema.index({ userId: 1, isActive: 1 });
chatbotSchema.index({ sessionId: 1 });

export default mongoose.model("Chatbot", chatbotSchema);
