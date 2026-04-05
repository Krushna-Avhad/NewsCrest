// models/UserActivity.js
// Persists rich article data at interaction time so timelines work even when
// the external News API is rate-limited or unreachable.
import mongoose from "mongoose";

const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Action type
    action: {
      type: String,
      enum: ["read", "saved", "unsaved", "manual_input"],
      required: true,
    },

    // Reference to the News doc (optional — may not exist for manual inputs)
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "News",
      default: null,
    },

    // ── Snapshot of the article at interaction time ─────────────────────────
    // Stored here so timeline generation never depends on the external API
    snapshot: {
      title:       { type: String, required: true },
      description: { type: String, default: "" },
      content:     { type: String, default: "" },
      url:         { type: String, default: "" },
      imageUrl:    { type: String, default: "" },
      source:      { type: String, default: "" },
      category:    { type: String, default: "" },
      publishedAt: { type: Date,   default: null },
      // AI-extracted at save time (or set via fallback NLP)
      keywords:    [{ type: String }],
      entities:    [{ type: String }],
    },

    // Timestamp of the user action
    actedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Compound index for fast "give me all read/saved for user X"
userActivitySchema.index({ userId: 1, action: 1, actedAt: -1 });
// Keyword search across saved history
userActivitySchema.index({ "snapshot.keywords": 1 });
userActivitySchema.index({ "snapshot.entities": 1 });
// Prevent exact duplicate read events (same user + article within 10 min is
// handled at application level, not here — just index for dedup queries)
userActivitySchema.index({ userId: 1, articleId: 1, action: 1 });

export default mongoose.model("UserActivity", userActivitySchema);
