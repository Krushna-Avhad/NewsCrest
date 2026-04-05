import mongoose from "mongoose";

const storyTimelineSchema = new mongoose.Schema({
  // The original article that "started" the story
  seedArticleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "News",
    required: true,
  },

  // Extracted story identity — used to match future articles
  storySlug: { type: String, required: true, unique: true }, // e.g. "ai-layoffs-tech-2024"
  title: { type: String, required: true },           // human-readable story title
  summary: { type: String },                         // AI-generated story summary
  category: { type: String },
  keywords: [{ type: String }],                      // key terms for matching
  entities: [{ type: String }],                      // people, orgs, places extracted

  // All articles in this story thread — ordered by date
  articles: [
    {
      articleId: { type: mongoose.Schema.Types.ObjectId, ref: "News" },
      addedAt: { type: Date, default: Date.now },
      isOrigin: { type: Boolean, default: false },   // marks the seed article
      eventLabel: { type: String },                  // "Announced", "Update", "Outcome"…
    },
  ],

  // Users who are following this story
  followers: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      followedAt: { type: Date, default: Date.now },
      // how the user got here — "read", "saved", "explicit follow"
      trigger: { type: String, enum: ["read", "saved", "manual"], default: "read" },
    },
  ],

  lastUpdatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

storyTimelineSchema.index({ keywords: 1 });
storyTimelineSchema.index({ entities: 1 });
storyTimelineSchema.index({ category: 1, lastUpdatedAt: -1 });
storyTimelineSchema.index({ "followers.userId": 1 });

export default mongoose.model("StoryTimeline", storyTimelineSchema);
