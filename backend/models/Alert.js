import mongoose from "mongoose";

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'News', required: true },
  type: { 
    type: String, 
    enum: ['breaking', 'personalized', 'location', 'interest', 'trending', 'daily_digest'],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium' 
  },
  isRead: { type: Boolean, default: false },
  isEmailSent: { type: Boolean, default: false },
  scheduledAt: Date,
  sentAt: Date,
  expiresAt: Date,
  metadata: {
    category: String,
    location: String,
    keywords: [String],
    relevanceScore: Number
  }
}, { timestamps: true });

alertSchema.index({ userId: 1, isRead: 1 });
alertSchema.index({ type: 1, priority: 1 });
alertSchema.index({ scheduledAt: 1 });

export default mongoose.model("Alert", alertSchema);