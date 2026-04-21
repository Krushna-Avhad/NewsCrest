// controllers/taskController.js
import mongoose from "mongoose";
import Task from "../models/Task.js";
import News from "../models/News.js";

// ✅ CREATE TASK/NOTE
export const createTask = async (req, res) => {
  try {
    const { title, content, type, dueDate, articleId, tags, priority } = req.body;
    const userId = req.user.id;     //gets logged in user

    // Validate article exists if provided
    if (articleId) {
      const article = await News.findById(articleId);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
    }

    const task = await Task.create({    //save task in DB
      userId,
      title,
      content,
      type: type || 'note',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      articleId,
      tags: tags || [],
      priority: priority || 'medium',
      metadata: articleId ? {
        //store article Info
        articleTitle: (await News.findById(articleId))?.title,
        articleUrl: (await News.findById(articleId))?.url,
        category: (await News.findById(articleId))?.category
      } : {}
    });

    res.status(201).json({
      message: "Task created successfully",
      task
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ CREATE NOTE FROM ARTICLE
export const createNoteFromArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { title, content, tags } = req.body;
    const userId = req.user.id;

    // Validate article exists
    const article = await News.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const task = await Task.create({
      userId,
      title: title || `Note: ${article.title}`,
      content: content || `Notes about: ${article.title}`,
      type: 'article_note',
      articleId,
      tags: tags || [],
      priority: 'medium',
      metadata: {
        articleTitle: article.title,
        articleUrl: article.url,
        category: article.category
      }
    });

    res.status(201).json({
      message: "Note created from article successfully",
      task
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET ALL TASKS/NOTES
export const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;  
    const skip = (page - 1) * limit;//how many record skip from DB
    const { type, isCompleted, isPinned, priority } = req.query;

    let query = { userId };
    if (type) query.type = type;
    if (isCompleted !== undefined) query.isCompleted = isCompleted === 'true';
    if (isPinned !== undefined) query.isPinned = isPinned === 'true';
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate('articleId', 'title source publishedAt imageUrl')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Task.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET SINGLE TASK/NOTE
export const getTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const task = await Task.findOne({ _id: taskId, userId })
      .populate('articleId', 'title source publishedAt imageUrl content');

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ UPDATE TASK/NOTE
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const { title, content, type, dueDate, tags, priority } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (tags !== undefined) updateData.tags = tags;
    if (priority !== undefined) updateData.priority = priority;

    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      updateData,
      { new: true, runValidators: true }
    ).populate('articleId', 'title source publishedAt imageUrl');

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({
      message: "Task updated successfully",
      task
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ TOGGLE TASK COMPLETION
export const toggleTaskCompletion = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.isCompleted = !task.isCompleted;     //toggle
    await task.save();

    res.json({
      message: `Task marked as ${task.isCompleted ? 'completed' : 'incomplete'}`,
      task
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ TOGGLE PIN STATUS
export const togglePinStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.isPinned = !task.isPinned;    //pin task
    await task.save();

    res.json({
      message: `Task ${task.isPinned ? 'pinned' : 'unpinned'} successfully`,
      task
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ DELETE TASK/NOTE
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const task = await Task.findOneAndDelete({ _id: taskId, userId });   //delete task

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET TASKS BY TYPE
export const getTasksByType = async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const tasks = await Task.find({ userId, type })   //key code
      .populate('articleId', 'title source publishedAt imageUrl')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Task.countDocuments({ userId, type });
    const totalPages = Math.ceil(total / limit);

    res.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET UPCOMING DEADLINES
//Fetch tasks with upcoming due dates
export const getUpcomingDeadlines = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 7;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const tasks = await Task.find({
      userId,
      dueDate: { $exists: true, $lte: futureDate },
      isCompleted: false
    })
    .populate('articleId', 'title source publishedAt imageUrl')
    .sort({ dueDate: 1 });

    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET TASK STATISTICS
export const getTaskStatistics = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Task.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] } },
          pinned: { $sum: { $cond: ['$isPinned', 1, 0] } },
          withDeadlines: { $sum: { $cond: [{ $ne: ['$dueDate', null] }, 1, 0] } }
        }
      }
    ]);

    const priorityStats = await Task.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] } }
        }
      }
    ]);

    const totalTasks = await Task.countDocuments({ userId });
    const completedTasks = await Task.countDocuments({ userId, isCompleted: true });
    const pendingTasks = totalTasks - completedTasks;
    const pinnedTasks = await Task.countDocuments({ userId, isPinned: true });

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      pinnedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      statsByType: stats,
      statsByPriority: priorityStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};