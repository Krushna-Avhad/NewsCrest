import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  profileType: { 
    type: [String], 
    enum: ['Student', 'IT Employee', 'Elderly', 'Business Person', 'Homemaker', 'General Reader'],
    default: 'General Reader'
  },
  interests: [{ type: String }],
  country: { type: String, default: "India" },
  state: String,
  city: String,
  notificationPreferences: {
    emailAlerts: { type: Boolean, default: true },
    breakingNews: { type: Boolean, default: true },
    personalizedAlerts: { type: Boolean, default: true },
    dailyDigest: { type: Boolean, default: false }
  },
  readingHistory: [{
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'News' },
    readAt: { type: Date, default: Date.now },
    readTime: Number
  }],
  savedArticles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'News' }],
  searchHistory: [{ query: String, searchedAt: { type: Date, default: Date.now } }],
  // ✅ ADDED: OTP Email Verification fields
  isVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null },

  lastLogin: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("User", userSchema);