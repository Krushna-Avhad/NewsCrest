// controllers/taskController.js
import Task from "../models/Task.js";

export const addTask = async (req, res) => {
  const task = await Task.create({
    userId: req.user.id,
    ...req.body,
  });

  res.json(task);
};

export const getTasks = async (req, res) => {
  const tasks = await Task.find({ userId: req.user.id });
  res.json(tasks);
};