// src/context/AppContext.jsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  authAPI,
  newsAPI,
  alertsAPI,
  tasksAPI,
  getToken,
} from "../services/api";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [page, setPageRaw] = useState("landing");
  const [history, setHistory] = useState([]);
  const [activeCat, setActiveCat] = useState("Technology");
  const [activeArticle, setActiveArticle] = useState(null);

  // Auth
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // News — all loaded independently of auth
  const [headlines, setHeadlines] = useState([]);
  const [feedArticles, setFeedArticles] = useState([]);
  const [trendingArticles, setTrendingArticles] = useState([]);
  const [localArticles, setLocalArticles] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Saved / Notes / Alerts (require auth)
  const [savedArticles, setSavedArticles] = useState([]);
  const [notes, setNotes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);

  // Compare / prefs
  const [compareArticle, setCompareArticle] = useState(null);
  const [chatbotInitialQuery, setChatbotInitialQuery] = useState(null);
  const [readingPrefs, setReadingPrefs] = useState({
    language: "English",
    feedLayout: "Card Grid",
    textSize: "Medium",
  });

  // ── Load PUBLIC news on mount — no auth needed ──────────────────────────────
  useEffect(() => {
    loadPublicNews();
  }, []);

  // ── Auto-login if token exists ──────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (token) {
      authAPI
        .getProfile()
        .then((data) => {
          // getProfile returns the user object directly (no wrapper)
          setUser(data);
        })
        .catch(() => {
          // Token expired / invalid — clear it
          localStorage.removeItem("nc_token");
        });
    }
  }, []);

  // ── Load auth-required data when user becomes available ────────────────────
  useEffect(() => {
    if (user) {
      // Load personalised feed (requires auth)
      loadPersonalisedFeed();
      loadSavedArticles();
      loadNotes();
      loadAlerts();
    }
  }, [user]);

  // ── Public news — headlines + trending (no auth needed) ────────────────────
const loadPublicNews = async () => {
    setNewsLoading(true);
    try {
      const [hl, trending] = await Promise.allSettled([
        newsAPI.getHeadlines(),
        newsAPI.getTrending(),
      ]);
      if (hl.status === "fulfilled" && hl.value.length > 0) {
        setHeadlines(hl.value);
        setFeedArticles((prev) => (prev.length === 0 ? hl.value : prev));
      }
      if (trending.status === "fulfilled" && trending.value.length > 0) {
        setTrendingArticles(trending.value);
      } else {
        // Fallback — use headlines as trending if trending fetch fails
        setTrendingArticles((prev) =>
          prev.length === 0 && hl.status === "fulfilled" ? hl.value : prev
        );
      }
    } catch (_) {}
    setNewsLoading(false);
  };
  
  // ── Personalised feed (requires auth) ──────────────────────────────────────
  const loadPersonalisedFeed = async () => {
    try {
      const [feed, local] = await Promise.allSettled([
        newsAPI.getFeed(),
        newsAPI.getLocal(),
      ]);
      if (feed.status === "fulfilled" && feed.value.length > 0) {
        setFeedArticles(feed.value);
      }
      if (local.status === "fulfilled" && local.value.length > 0) {
        setLocalArticles(local.value);
      }
    } catch (_) {}
  };

  // ── Full dashboard reload (called manually e.g. pull-to-refresh) ───────────
  const loadDashboardData = async () => {
    setNewsLoading(true);
    await Promise.allSettled([
      loadPublicNews(),
      user ? loadPersonalisedFeed() : Promise.resolve(),
    ]);
    setNewsLoading(false);
  };

  const loadSavedArticles = async () => {
    try {
      const articles = await newsAPI.getSaved();
      setSavedArticles(
        articles.map((a) => ({
          ...a,
          savedAt: a.savedAt || new Date().toISOString(),
        })),
      );
    } catch (_) {}
  };

  const loadNotes = async () => {
    try {
      const tasks = await tasksAPI.getAll();
      setNotes(
        tasks.map((t) => ({
          id: t._id || t.id,
          title: t.title,
          content: t.content,
          pinned: t.isPinned ?? false,
          done: t.isCompleted ?? false,
          status: t.isCompleted ? "completed" : "inprogress",
          due: t.dueDate ? t.dueDate.slice(0, 10) : null,
          articleTitle: t.metadata?.articleTitle || null,
          articleId: t.articleId || null,
          createdAt: t.createdAt || new Date().toISOString(),
        })),
      );
    } catch (_) {}
  };

  const loadAlerts = async () => {
    try {
      const [all, count] = await Promise.all([
        alertsAPI.getAll(),
        alertsAPI.getUnreadCount(),
      ]);
      setAlerts(all);
      setAlertCount(count);
    } catch (_) {}
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const setPage = useCallback((newPage) => {
    setPageRaw((prev) => {
      if (prev !== newPage) setHistory((h) => [...h.slice(-19), prev]);
      return newPage;
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setPageRaw(prev);
      return h.slice(0, -1);
    });
  }, []);

  const canGoBack = history.length > 0;

  const openArticle = useCallback((article) => {
    setActiveArticle(article);
    setPageRaw((prev) => {
      setHistory((h) => [...h.slice(-19), prev]);
      return "article";
    });
  }, []);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email, password) => {
      setAuthLoading(true);
      setAuthError("");
      try {
        const data = await authAPI.login(email, password);
        // login returns { token, user }
        setUser(data.user);
        setPage("dashboard");
        return true;
      } catch (err) {
        setAuthError(err.message || "Login failed. Please try again.");
        return false;
      } finally {
        setAuthLoading(false);
      }
    },
    [setPage],
  );

  const signup = useCallback(
    async (payload) => {
      setAuthLoading(true);
      setAuthError("");
      try {
        const data = await authAPI.signup(payload);
        // signup returns { token, user, message }
        setUser(data.user);
        setPage("dashboard");
        return true;
      } catch (err) {
        setAuthError(err.message || "Sign up failed. Please try again.");
        return false;
      } finally {
        setAuthLoading(false);
      }
    },
    [setPage],
  );

  const logout = useCallback(async () => {
    await authAPI.logout();
    setUser(null);
    setSavedArticles([]);
    setNotes([]);
    setAlerts([]);
    setAlertCount(0);
    setFeedArticles([]);
    setLocalArticles([]);
    setPage("landing");
  }, [setPage]);

  const updateProfile = useCallback(async (payload) => {
    const data = await authAPI.updateProfile(payload);
    setUser(data.user || data);
    // Reload personalised feed with updated interests/profile
    await loadPersonalisedFeed();
    return data;
  }, []);

  // ── Save / Unsave ───────────────────────────────────────────────────────────
  const toggleSaveArticle = useCallback(
    async (article) => {
      const id = article.id || article._id;
      const isSaved = savedArticles.some((a) => a.id === id);
      // Optimistic update
      if (isSaved) {
        setSavedArticles((prev) => prev.filter((a) => a.id !== id));
      } else {
        setSavedArticles((prev) => [
          ...prev,
          { ...article, savedAt: new Date().toISOString() },
        ]);
      }
      try {
        if (isSaved) await newsAPI.unsaveArticle(id);
        else await newsAPI.saveArticle(id);
      } catch (_) {
        // Rollback on failure
        if (isSaved)
          setSavedArticles((prev) => [
            ...prev,
            { ...article, savedAt: new Date().toISOString() },
          ]);
        else setSavedArticles((prev) => prev.filter((a) => a.id !== id));
      }
    },
    [savedArticles],
  );

  const isArticleSaved = useCallback(
    (id) => savedArticles.some((a) => a.id === id),
    [savedArticles],
  );

  // ── Notes ───────────────────────────────────────────────────────────────────
  const addNote = useCallback(async (note) => {
    try {
      const data = await tasksAPI.create({
        title: note.title,
        content: note.content,
        type: note.articleId ? "article_note" : "note",
        dueDate: note.due || undefined,
        articleId: note.articleId || undefined,
      });
      const task = data.task || data;
      setNotes((prev) => [
        {
          id: task._id || task.id,
          title: task.title,
          content: task.content,
          pinned: false,
          done: false,
          status: "inprogress",
          due: task.dueDate ? task.dueDate.slice(0, 10) : null,
          articleTitle: note.articleTitle || null,
          createdAt: task.createdAt || new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (_) {
      // Fallback: add locally
      setNotes((prev) => [
        { ...note, id: Date.now(), createdAt: new Date().toISOString() },
        ...prev,
      ]);
    }
  }, []);

  const updateNote = useCallback(async (id, changes) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...changes } : n)),
    );
    try {
      if ("done" in changes) await tasksAPI.toggle(id);
      else if ("pinned" in changes) await tasksAPI.pin(id);
      else {
        const apiChanges = {};
        if (changes.title !== undefined) apiChanges.title = changes.title;
        if (changes.content !== undefined) apiChanges.content = changes.content;
        if (changes.due !== undefined) apiChanges.dueDate = changes.due;
        if (Object.keys(apiChanges).length)
          await tasksAPI.update(id, apiChanges);
      }
    } catch (_) {}
  }, []);

  const deleteNote = useCallback(async (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await tasksAPI.delete(id);
    } catch (_) {}
  }, []);

  // ── Alerts ──────────────────────────────────────────────────────────────────
  const markAlertRead = useCallback(async (id) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a._id === id || a.id === id ? { ...a, isRead: true } : a,
      ),
    );
    setAlertCount((c) => Math.max(0, c - 1));
    try {
      await alertsAPI.markRead(id);
    } catch (_) {}
  }, []);

  const markAllAlertsRead = useCallback(async () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    setAlertCount(0);
    try {
      await alertsAPI.markAllRead();
    } catch (_) {}
  }, []);

  const deleteAlert = useCallback(
    async (id) => {
      const a = alerts.find((x) => x._id === id || x.id === id);
      setAlerts((prev) => prev.filter((x) => x._id !== id && x.id !== id));
      if (a && !a.isRead) setAlertCount((c) => Math.max(0, c - 1));
      try {
        await alertsAPI.delete(id);
      } catch (_) {}
    },
    [alerts],
  );

  const openCompareWith = useCallback((article) => {
    setCompareArticle(article);
    setPageRaw((prev) => {
      setHistory((h) => [...h.slice(-19), prev]);
      return "compare";
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        page,
        setPage,
        goBack,
        canGoBack,
        activeCat,
        setActiveCat,
        activeArticle,
        openArticle,
        user,
        authLoading,
        authError,
        login,
        signup,
        logout,
        updateProfile,
        headlines,
        feedArticles,
        trendingArticles,
        localArticles,
        newsLoading,
        loadDashboardData,
        savedArticles,
        toggleSaveArticle,
        isArticleSaved,
        loadSavedArticles,
        notes,
        addNote,
        updateNote,
        deleteNote,
        loadNotes,
        alerts,
        alertCount,
        markAlertRead,
        markAllAlertsRead,
        deleteAlert,
        loadAlerts,
        readingPrefs,
        setReadingPrefs,
        compareArticle,
        setCompareArticle,
        openCompareWith,
        chatbotInitialQuery,
        setChatbotInitialQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
