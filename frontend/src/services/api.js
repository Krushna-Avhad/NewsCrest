// src/services/api.js
// Precisely matched to actual backend controller response shapes

const BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "http://localhost:5000/api";

// ─── Token helpers ────────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem("nc_token");
export const setToken = (t) => localStorage.setItem("nc_token", t);
export const removeToken = () => localStorage.removeItem("nc_token");

function authHeaders() {
  const token = getToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data;
}

// ─── Normalise article ────────────────────────────────────────────────────────
// Backend returns MongoDB docs — map to the shape the UI expects
export function normaliseArticle(a) {
  if (!a) return null;
  return {
    id: a._id || a.id,
    title: a.title || "",
    summary: a.summary || a.aiGenerated?.summary || "",
    hatkeSummary: a.hatkeSummary || a.aiGenerated?.hatkeSummary || "",
    content: a.content || a.summary || "",
    category: a.category || "General",
    source: a.source || "",
    author: a.author || "",
    url: a.url || "",
    imageUrl: a.imageUrl || "",
    publishedAt: a.publishedAt || null,
    time: a.publishedAt ? timeAgo(new Date(a.publishedAt)) : "",
    readTime: a.readTime ? `${a.readTime} min read` : "",
    saved: a.saved ?? false,
    trending: a.trending ?? false,
    tags: a.tags || [],
    sentiment: a.sentiment || "neutral",
    importance: a.importance || "medium",
    location: a.location || null,
    engagement: a.engagement || { shares: 0, comments: 0, saves: 0 },
  };
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
// POST /api/auth/login  → { token, user }
// POST /api/auth/signup → { token, user, message }
// GET  /api/auth/profile → user object directly
// PUT  /api/auth/profile → user object directly
export const authAPI = {
  login: async (email, password) => {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.token) setToken(data.token);
    return data; // { token, user }
  },

  signup: async (payload) => {
    const data = await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (data.token) setToken(data.token);
    return data; // { token, user, message }
  },

  getProfile: () => request("/auth/profile"), // returns user object directly
  updateProfile: (payload) =>
    request("/auth/profile", { method: "PUT", body: JSON.stringify(payload) }),
  logout: async () => {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch (_) {}
    removeToken();
  },
};

// ─── NEWS ─────────────────────────────────────────────────────────────────────
// All news endpoints return { news: [...] } EXCEPT:
//   getSaved → { articles: [...] }
//   getById  → { article: {} }
export const newsAPI = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const data = await request(`/news${q ? `?${q}` : ""}`);
    // returns { news, pagination }
    return (data.news || []).map(normaliseArticle);
  },

  getFeed: async () => {
    const data = await request("/news/feed");
    // returns { news, pagination, ... }
    return (data.news || []).map(normaliseArticle);
  },

  getHeadlines: async () => {
    const data = await request("/news/headlines");
    // returns { news }
    return (data.news || []).map(normaliseArticle);
  },

  getTrending: async () => {
    const data = await request("/news/trending");
    // returns { news }
    return (data.news || []).map(normaliseArticle);
  },

  getByCategory: async (category) => {
    const data = await request(
      `/news/category/${encodeURIComponent(category)}`,
    );
    // returns { news, pagination }
    return (data.news || []).map(normaliseArticle);
  },

  getLocal: async () => {
    const data = await request("/news/local");
    // returns { news, pagination }
    return (data.news || []).map(normaliseArticle);
  },

  getGoodNews: async () => {
    const data = await request("/news/good");
    // returns { news }
    return (data.news || []).map(normaliseArticle);
  },

  getById: async (id) => {
    const data = await request(`/news/${id}`);
    // returns { article }
    return normaliseArticle(data.article || data);
  },

  getSaved: async () => {
    const data = await request("/news/saved");
    // returns { articles, pagination }
    return (data.articles || []).map(normaliseArticle);
  },

  saveArticle: (id) => request(`/news/${id}/save`, { method: "POST" }),
  unsaveArticle: (id) => request(`/news/${id}/save`, { method: "DELETE" }),
  refresh: () => request("/news/refresh", { method: "POST" }),
};

// ─── SEARCH ───────────────────────────────────────────────────────────────────
// GET /api/search        → { news, query, pagination }
// GET /api/search/trending → { trendingTags: [{tag, count}], trendingCategories: [{category, count}] }
export const searchAPI = {
  search: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const data = await request(`/search?${q}`);
    // returns { news, query, pagination }
    return (data.news || []).map(normaliseArticle);
  },

  getTrending: async () => {
    const data = await request("/search/trending");
    // returns { trendingTags: [{tag, count}], trendingCategories: [{category, count}] }
    // Return trendingTags as simple strings for the UI
    return (data.trendingTags || []).map((t) => t.tag || t);
  },

  getSuggestions: async (q) => {
    const data = await request(
      `/search/suggestions?q=${encodeURIComponent(q)}`,
    );
    return data.suggestions || [];
  },

  getHistory: () => request("/search/history"),
  clearHistory: () => request("/search/history", { method: "DELETE" }),
};

// ─── ALERTS ───────────────────────────────────────────────────────────────────
// GET /api/alerts            → { alerts, pagination }
// GET /api/alerts/unread-count → { unreadCount }
export const alertsAPI = {
  getAll: async () => {
    const data = await request("/alerts");
    // returns { alerts, pagination }
    return data.alerts || [];
  },

  getUnreadCount: async () => {
    const data = await request("/alerts/unread-count");
    // returns { unreadCount }
    return data.unreadCount ?? 0;
  },

  markRead: (id) => request(`/alerts/${id}/read`, { method: "PUT" }),
  markAllRead: () => request("/alerts/read-all", { method: "PUT" }),
  delete: (id) => request(`/alerts/${id}`, { method: "DELETE" }),
  clearAll: () => request("/alerts/clear", { method: "DELETE" }),
};

// ─── TASKS / NOTES ────────────────────────────────────────────────────────────
// GET /api/tasks     → { tasks, pagination }
// POST /api/tasks    → { task, message }
// PUT /api/tasks/:id → { task, message }
export const tasksAPI = {
  getAll: async () => {
    const data = await request("/tasks");
    // returns { tasks, pagination }
    return data.tasks || [];
  },

  create: (payload) =>
    request("/tasks", { method: "POST", body: JSON.stringify(payload) }),
  // returns { task, message }

  update: (id, payload) =>
    request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  // returns { task, message }

  toggle: (id) => request(`/tasks/${id}/toggle`, { method: "PUT" }),
  pin: (id) => request(`/tasks/${id}/pin`, { method: "PUT" }),
  delete: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
};

// ─── CHATBOT ──────────────────────────────────────────────────────────────────
// POST /api/chatbot/start   → { sessionId, message }
// POST /api/chatbot/message → { message: {type,content,...}, articles, sessionId, suggestedCategories }
export const chatbotAPI = {
  startSession: async () => {
    const data = await request("/chatbot/start", { method: "POST" });
    // returns { sessionId, message }
    return data.sessionId;
  },

  sendMessage: async (sessionId, message) => {
    const data = await request("/chatbot/message", {
      method: "POST",
      body: JSON.stringify({ sessionId, message }),
    });
    // returns { message: {type, content, ...}, articles: [...], sessionId, suggestedCategories }
    return {
      text: data.message?.content || "",
      news: (data.articles || []).map(normaliseArticle),
      sessionId: data.sessionId || sessionId,
    };
  },

  getHistory: async (sessionId) => {
    const data = await request(`/chatbot/history/${sessionId}`);
    // returns { sessionId, messages, lastActivity }
    return data.messages || [];
  },

  getSessions: async () => {
    const data = await request("/chatbot/sessions");
    return data.sessions || [];
  },

  endSession: (sessionId) =>
    request(`/chatbot/session/${sessionId}`, { method: "DELETE" }),
  clearAll: () => request("/chatbot/clear", { method: "DELETE" }),
};

// ─── COMPARE ──────────────────────────────────────────────────────────────────
// POST /api/compare                        → { comparison, message }
// POST /api/compare/articles/:id1/:id2    → { comparison, message }
// comparison object has: results { similarities, differences, insight, sentiment, coverage, impact, keyFocus }
export const compareAPI = {
  compare: async (item1, item2) => {
    const data = await request("/compare", {
      method: "POST",
      body: JSON.stringify({ item1, item2 }),
    });
    // returns { comparison, message }
    // comparison.results has the actual AI analysis
    return data.comparison?.results || data.comparison || data;
  },

  compareByIds: async (id1, id2) => {
    const data = await request(`/compare/articles/${id1}/${id2}`, {
      method: "POST",
    });
    // returns { comparison, message }
    return data.comparison?.results || data.comparison || data;
  },

  getHistory: async () => {
    const data = await request("/compare/history");
    return data.comparisons || [];
  },
};

// ─── HATKE ────────────────────────────────────────────────────────────────────
// GET /api/hatke              → { news, pagination }
// POST /api/hatke/article/:id/hatke → { articleId, hatkeSummary, ... }
export const hatkeAPI = {
  getAll: async () => {
    const data = await request("/hatke");
    // returns { news, pagination }
    return data.news || [];
  },

  getTrending: async () => {
    const data = await request("/hatke/trending");
    return data.news || [];
  },

  generateForArticle: (articleId) =>
    request(`/hatke/article/${articleId}/hatke`, { method: "POST" }),
  // returns { articleId, title, originalSummary, hatkeSummary, message }
};
