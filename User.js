import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },

  // ✅ OTP fields
  isVerified: { type: Boolean, default: false },
  otp: String,
  otpExpiry: Date,

  profileType: { 
    type: String, 
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

  lastLogin: Date,
  isActive: { type: Boolean, default: true }

}, { timestamps: true });

export default mongoose.model("User", userSchema);