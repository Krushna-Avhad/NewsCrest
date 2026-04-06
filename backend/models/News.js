import mongoose from "mongoose";

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  summary: { type: String },
  hatkeSummary: { type: String },
  url: { type: String, required: true },
  source: { type: String, required: true },
  author: String,
  publishedAt: { type: Date, required: true },
  category: { 
    type: String, 
    enum: ['Top Headlines', 'Good News', 'Finance', 'Business', 'Technology', 'Entertainment', 
            'Sports', 'Science', 'Health', 'Fashion', 'Politics', 'Education', 'India', 'World', 'Local'],
    required: true 
  },
  subCategory: String,
  tags: [{ type: String }],
  imageUrl: String,
  readTime: { type: Number, default: 5 },
  location: {
    country: String,
    state: String,
    city: String
  },
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral'
  },
  importance: {
    type: String,
    enum: ['low', 'medium', 'high', 'breaking'],
    default: 'medium'
  },
  trending: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  engagement: {
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    saves: { type: Number, default: 0 }
  },
  aiGenerated: {
    summary: { type: Boolean, default: false },
    hatkeSummary: { type: Boolean, default: false },
    simplifiedVersion: { type: Boolean, default: false }
  },
  externalId: String, // For API integration
  language: { type: String, default: 'en' }
}, { timestamps: true });

// Index for search
newsSchema.index({ title: 'text', content: 'text', tags: 'text' });
newsSchema.index({ category: 1, publishedAt: -1 });
newsSchema.index({ location: 1, category: 1 });
newsSchema.index({ trending: -1, publishedAt: -1 });

export default mongoose.model("News", newsSchema);