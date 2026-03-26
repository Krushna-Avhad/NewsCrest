import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  interests: [String],
  country: { type: String, default: "India" },
  state: String,
  city: String,
  savedNews: [],
}, { timestamps: true });

export default mongoose.model("User", userSchema);