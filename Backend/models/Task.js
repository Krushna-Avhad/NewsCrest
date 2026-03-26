// models/Task.js
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  userId: String,
  title: String,
  dueDate: Date,
  completed: { type: Boolean, default: false },
});

export default mongoose.model("Task", taskSchema);