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
  // ✅ FIX 1: start true — Router must not act until token check is complete
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  // OTP verification state — set after signup, cleared after verifyOtp
  const [pendingOtpEmail, setPendingOtpEmail] = useState(null);

  // News — all loaded independently of auth
  const [headlines, setHeadlines] = useState([]);
  const [feedArticles, setFeedArticles] = useState([]);
  const [trendingArticles, setTrendingArticles] = useState([]);
  const [localArticles, setLocalArticles] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Pagination for "load more" in Explore/Categories
  const [newsPagination, setNewsPagination] = useState(null);
  const [newsPage, setNewsPage] = useState(1);
  const [allArticles, setAllArticles] = useState([]);
  const [allArticlesLoading, setAllArticlesLoading] = useState(false);

  // Saved / Notes / Alerts (require auth)
  const [savedArticles, setSavedArticles] = useState([]);
  const [notes, setNotes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);

  // Compare / prefs
  const [compareArticle, setCompareArticle] = useState(null);
  const [chatbotInitialQuery, setChatbotInitialQuery] = useState(null);
  const [perspectivesHandoff, setPerspectivesHandoff] = useState(null);
  // ✅ FIXED: raw setter kept internal; setReadingPrefs persists to DB
  const [readingPrefs, setReadingPrefsRaw] = useState({
    language: "English",
    feedLayout: "Card Grid",
    textSize: "Medium",
  });

  // -- Apply text size to <html> whenever readingPrefs.textSize changes ---------
  useEffect(() => {
    const size = (readingPrefs.textSize || "Medium").toLowerCase();
    const html = document.documentElement;
    html.classList.remove("text-size-small", "text-size-medium", "text-size-large");
    html.classList.add(`text-size-${size}`);
  }, [readingPrefs.textSize]);

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
          // ✅ FIXED: seed reading prefs from DB on auto-login
          setReadingPrefsRaw({
            language: data.language || "English",
            feedLayout: data.feedLayout || "Card Grid",
            textSize: data.textSize || "Medium",
          });
        })
        .catch(() => {
          // Token expired / invalid — clear it
          localStorage.removeItem("nc_token");
        })
        .finally(() => {
          // ✅ FIX 2: always unblock Router — whether token was valid or expired
          setAuthLoading(false);
        });
    } else {
      // ✅ FIX 3: no token — unblock Router immediately
      setAuthLoading(false);
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
      const [hl, trending, all] = await Promise.allSettled([
        newsAPI.getHeadlines(),
        newsAPI.getTrending(),
        newsAPI.getAll({ page: 1, limit: 50 }), // ✅ load 50 articles upfront
      ]);

      if (hl.status === "fulfilled" && hl.value.length > 0) {
        setHeadlines(hl.value);
      }

      if (trending.status === "fulfilled" && trending.value.length > 0) {
        setTrendingArticles(trending.value);
      }

      if (all.status === "fulfilled") {
        const { articles, pagination } = all.value;
        setAllArticles(articles);
        setNewsPagination(pagination);
        // Use as feedArticles fallback until personalized feed loads
        if (articles.length > 0) {
          setFeedArticles((prev) => (prev.length === 0 ? articles : prev));
          // Use as headlines fallback if headlines fetch failed
          if (hl.status !== "fulfilled" || hl.value.length === 0) {
            setHeadlines(articles.slice(0, 10));
          }
          // Use as trending fallback
          if (trending.status !== "fulfilled" || trending.value.length === 0) {
            setTrendingArticles(articles.slice(0, 15));
          }
        }
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

  // ── Load more articles (pagination for Explore page) ───────────────────────
  const loadMoreArticles = async () => {
    if (!newsPagination?.hasNext || allArticlesLoading) return;
    setAllArticlesLoading(true);
    try {
      const nextPage = newsPage + 1;
      const { articles, pagination } = await newsAPI.getAll({ page: nextPage, limit: 50 });
      setAllArticles((prev) => [...prev, ...articles]);
      setNewsPagination(pagination);
      setNewsPage(nextPage);
    } catch (_) {}
    setAllArticlesLoading(false);
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
        // ✅ FIXED: seed reading prefs from DB on login
        setReadingPrefsRaw({
          language: data.user.language || "English",
          feedLayout: data.user.feedLayout || "Card Grid",
          textSize: data.user.textSize || "Medium",
        });
        setPage("dashboard");
        // Reload alerts after a short delay — backend processes notifications
        // asynchronously after login, so we wait 2s before fetching
        setTimeout(() => {
          alertsAPI.getAll().then((all) => setAlerts(all)).catch(() => {});
          alertsAPI.getUnreadCount().then((c) => setAlertCount(c)).catch(() => {});
        }, 2000);
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
        // New OTP flow: backend returns { message: "OTP sent..." } with no token
        // Store email so OTP screen can use it, then navigate to otp page
        setPendingOtpEmail(payload.email);
        setPage("otp");
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

  const verifyOtp = useCallback(
    async (email, otp) => {
      setAuthLoading(true);
      setAuthError("");
      try {
        const data = await authAPI.verifyOtp(email, otp);
        // verifyOtp returns { token, user, message }
        setUser(data.user);
        // ✅ FIXED: seed reading prefs from DB after OTP verify
        setReadingPrefsRaw({
          language: data.user.language || "English",
          feedLayout: data.user.feedLayout || "Card Grid",
          textSize: data.user.textSize || "Medium",
        });
        setPendingOtpEmail(null);
        setPage("dashboard");
        // Reload alerts after backend processes first-login notifications
        setTimeout(() => {
          alertsAPI.getAll().then((all) => setAlerts(all)).catch(() => {});
          alertsAPI.getUnreadCount().then((c) => setAlertCount(c)).catch(() => {});
        }, 2500);
        return true;
      } catch (err) {
        setAuthError(err.message || "OTP verification failed.");
        return false;
      } finally {
        setAuthLoading(false);
      }
    },
    [setPage],
  );

  const resendOtp = useCallback(async (email) => {
    setAuthError("");
    try {
      await authAPI.resendOtp(email);
      return true;
    } catch (err) {
      setAuthError(err.message || "Failed to resend OTP.");
      return false;
    }
  }, []);

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

  // ✅ ADDED: setReadingPrefs persists to DB (fire-and-forget) + updates local state
  const setReadingPrefs = useCallback((updater) => {
    setReadingPrefsRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // Persist to backend without blocking UI
      authAPI.updatePreferences({
        textSize: next.textSize,
        language: next.language,
        feedLayout: next.feedLayout,
      }).then((data) => {
        // Keep user object in sync with saved prefs
        if (data?.user) setUser(data.user);
      }).catch(() => {});
      return next;
    });
  }, []);

  // ✅ ADDED: change password — validates old, hashes new on backend
  const changePassword = useCallback(async ({ oldPassword, newPassword }) => {
    const data = await authAPI.changePassword({ oldPassword, newPassword });
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
        verifyOtp,
        resendOtp,
        pendingOtpEmail,
        logout,
        updateProfile,
        changePassword,
        headlines,
        feedArticles,
        trendingArticles,
        localArticles,
        newsLoading,
        loadDashboardData,
        allArticles,
        allArticlesLoading,
        newsPagination,
        loadMoreArticles,
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
        perspectivesHandoff,
        setPerspectivesHandoff,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
