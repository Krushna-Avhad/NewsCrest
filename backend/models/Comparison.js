import mongoose from "mongoose";

const comparisonSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  item1: {
    title: String,
    content: String,
    url: String,
    source: String,
    type: { type: String, enum: ['article', 'topic', 'headline'], default: 'article' }
  },
  item2: {
    title: String,
    content: String,
    url: String,
    source: String,
    type: { type: String, enum: ['article', 'topic', 'headline'], default: 'article' }
  },
  results: {
    similarities: [{
      aspect: String,
      description: String,
      confidence: Number
    }],
    differences: [{
      aspect: String,
      description: String,
      confidence: Number
    }],
    insights: [{
      type: String,
      content: String,
      importance: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
    }],
    overallScore: Number,
    sentiment: {
      item1: String,
      item2: String,
      comparison: String
    }
  },
  processingTime: Number,
  aiGenerated: { type: Boolean, default: true }
}, { timestamps: true });

comparisonSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Comparison", comparisonSchema);
