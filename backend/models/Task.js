// models/Task.js
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['note', 'reminder', 'article_note', 'deadline'],
    default: 'note' 
  },
  isPinned: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  dueDate: Date,
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'News' }, // For article-linked notes
  tags: [{ type: String }],
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'],
    default: 'medium' 
  },
  metadata: {
    articleTitle: String,
    articleUrl: String,
    category: String
  }
}, { timestamps: true });

taskSchema.index({ userId: 1, isCompleted: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ type: 1, priority: 1 });

export default mongoose.model("Task", taskSchema);