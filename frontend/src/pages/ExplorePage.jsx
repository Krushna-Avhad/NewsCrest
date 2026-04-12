// src/pages/ExplorePage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { NewsCard } from "../components/cards/NewsCard";
import { Tabs, Button } from "../components/ui/Primitives";
import { searchAPI, normaliseArticle } from "../services/api";
import { SearchIcon, FilterIcon, TrendingIcon } from "../components/ui/Icons";

const TABS = ["All", "World", "India", "Local", "Trending", "Latest"];

// Tabs that map to a fixed DB category (passed to /search?category=...)
const TAB_CATEGORY_MAP = {
  World: "World",
  India: "India",
  Local: "Local",
};

const BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "http://localhost:5000/api";

const LIMIT = 50; // articles per page across every tab

// ── Fetch helpers ─────────────────────────────────────────────────────────────

function authHeaders() {
  const token = localStorage.getItem("nc_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// GET /api/news?page=&limit=   — All / Latest  (sorted by publishedAt desc)
async function fetchAllNews(page) {
  const res  = await fetch(`${BASE_URL}/news?page=${page}&limit=${LIMIT}`, { headers: authHeaders() });
  const data = await res.json();
  return {
    articles:   (data.news || []).map(normaliseArticle),
    pagination: data.pagination || null,
  };
}

// GET /api/news/trending?page=&limit=   — Trending tab (paginated trending sort)
async function fetchTrending(page) {
  const res  = await fetch(`${BASE_URL}/news/trending?page=${page}&limit=${LIMIT}`, { headers: authHeaders() });
  const data = await res.json();
  return {
    articles:   (data.news || []).map(normaliseArticle),
    pagination: data.pagination || null,
  };
}

// GET /api/search?q=&category=&page=&limit=  — search + category tabs
async function fetchSearch(params) {
  const q   = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/search?${q}`, { headers: authHeaders() });
  const data = await res.json();
  return {
    articles:   (data.news || []).map(normaliseArticle),
    pagination: data.pagination || null,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const { openArticle } = useApp();

  const [activeTab, setActiveTab]           = useState("All");
  const [query, setQuery]                   = useState("");
  const [results, setResults]               = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [page, setPage]                     = useState(1);
  const [hasMore, setHasMore]               = useState(false);
  const [totalCount, setTotalCount]         = useState(0);

  // Always-fresh snapshot so loadMore never closes over stale values
  const stateRef   = useRef({ query: "", activeTab: "All" });
  stateRef.current = { query, activeTab };

  const debounceRef = useRef(null);

  // ── Core fetch — every tab goes through the API ───────────────────────────
  const fetchArticles = useCallback(async (q, tab, pageNum, append = false) => {
    if (append) setLoadingMore(true);
    else        setLoading(true);

    try {
      let articles   = [];
      let pagination = null;

      if (tab === "Trending") {
        // Paginated trending sort from /news/trending
        const data = await fetchTrending(pageNum);
        articles   = data.articles;
        pagination = data.pagination;

      } else if (tab === "Latest" || (tab === "All" && !q.trim())) {
        // All news newest-first from /news
        const data = await fetchAllNews(pageNum);
        articles   = data.articles;
        pagination = data.pagination;

      } else {
        // "All" with query, or World / India / Local (with or without query)
        const params = { page: pageNum, limit: LIMIT };
        if (q.trim())               params.q        = q.trim();
        if (TAB_CATEGORY_MAP[tab])  params.category = TAB_CATEGORY_MAP[tab];
        const data = await fetchSearch(params);
        articles   = data.articles;
        pagination = data.pagination;
      }

      if (append) {
        setResults((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...articles.filter((a) => !seen.has(a.id))];
        });
      } else {
        setResults(articles);
      }

      setHasMore(pagination?.hasNext ?? false);
      setTotalCount(pagination?.total ?? articles.length);

    } catch (_) {
      if (!append) setResults([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []); // no deps — all logic is self-contained via params

  // ── Load trending topic pills on mount ─────────────────────────────────────
  useEffect(() => {
    searchAPI
      .getTrending()
      .then((topics) => setTrendingTopics(topics.slice(0, 8)))
      .catch(() => {});

    // Initial load — All tab, page 1
    fetchArticles("", "All", 1, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live search — 300 ms debounce on every keystroke ──────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchArticles(query, activeTab, 1, false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab change — immediate, cancels pending debounce ──────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    setPage(1);
    fetchArticles(query, activeTab, 1, false);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load More ──────────────────────────────────────────────────────────────
  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(stateRef.current.query, stateRef.current.activeTab, nextPage, true);
  };

  // ── Trending topic pill click ──────────────────────────────────────────────
  const handleTrendingClick = (topic) => {
    const text =
      typeof topic === "string"
        ? topic
        : topic.label || topic.keyword || topic.tag || "";
    clearTimeout(debounceRef.current);
    setQuery(text);
    setActiveTab("All");
    setPage(1);
    fetchArticles(text, "All", 1, false);
  };

  // ── Clear search ───────────────────────────────────────────────────────────
  const handleClear = () => {
    clearTimeout(debounceRef.current);
    setQuery("");
    setPage(1);
    fetchArticles("", activeTab, 1, false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppShell title="Search & Explore">

      {/* Search bar */}
      <div className="relative mb-6 slide-in-left">
        <SearchIcon
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") handleClear(); }}
          placeholder="Search headlines, topics, sources..."
          className="w-full pl-11 pr-28 py-3.5 border-[1.5px] border-gold/30 rounded-[16px] text-[15px] font-inter bg-white outline-none text-text-primary placeholder:text-text-muted transition-all duration-200 shadow-card focus:border-gold focus:shadow-[0_0_0_3px_rgba(218,165,32,0.1)]"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-maroon text-white rounded-[10px] px-3 py-1.5 text-[12px] font-semibold hover:bg-maroon-dark transition-colors duration-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Trending topic pills */}
      {trendingTopics.length > 0 && (
        <div className="mb-6 panel-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <TrendingIcon size={14} className="text-maroon" />
            <span className="text-[12px] font-semibold text-text-muted uppercase tracking-[1px]">
              Trending Topics
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((topic, i) => (
              <button
                key={i}
                onClick={() => handleTrendingClick(topic)}
                className="inline-flex items-center gap-1.5 px-[14px] py-[6px] rounded-full text-[12px] font-medium border border-gold-subtle bg-white text-text-secondary hover:border-gold hover:text-maroon hover:bg-lemon transition-all duration-200 cursor-pointer"
              >
                {typeof topic === "string"
                  ? topic
                  : topic.keyword || topic.label || topic.tag || ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs + Filter */}
      <div className="flex items-center justify-between mb-6">
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
        <Button variant="secondary" size="sm">
          <FilterIcon size={14} /> Filter
        </Button>
      </div>

      {/* Results count */}
      {!loading && (
        <div className="mb-4 text-[13px] text-text-muted">
          Showing{" "}
          <span className="font-semibold text-text-primary">{results.length}</span>
          {totalCount > results.length && (
            <>
              {" "}of{" "}
              <span className="font-semibold text-text-primary">{totalCount}</span>
            </>
          )}{" "}
          stories
          {query && (
            <> for <span className="font-semibold text-maroon">"{query}"</span></>
          )}
        </div>
      )}

      {/* Loading skeleton — first page */}
      {loading ? (
        <div className="grid grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-card border border-gold-subtle p-4 animate-pulse"
            >
              <div className="h-3 bg-smoke rounded w-1/3 mb-3" />
              <div className="h-4 bg-smoke rounded w-full mb-2" />
              <div className="h-4 bg-smoke rounded w-4/5" />
            </div>
          ))}
        </div>

      ) : results.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-5">
            {results.map((a) => (
              <div key={a.id} className="card-reveal">
                <NewsCard article={a} onClick={openArticle} />
              </div>
            ))}
          </div>

          {/* Load More button — shown on every tab when more pages exist */}
          {hasMore && (
            <div className="flex flex-col items-center mt-8 gap-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-8 py-3 rounded-[12px] border border-gold/40 bg-white text-maroon font-semibold text-[13px] hover:bg-lemon hover:border-gold transition-all duration-200 disabled:opacity-50"
              >
                {loadingMore
                  ? "Loading..."
                  : `Load More · ${totalCount - results.length} remaining`}
              </button>
              <span className="text-[11px] text-text-muted">
                Showing {results.length} of {totalCount} articles
              </span>
            </div>
          )}

          {/* Skeleton cards appended below while loading next page */}
          {loadingMore && (
            <div className="grid grid-cols-3 gap-5 mt-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-card border border-gold-subtle p-4 animate-pulse"
                >
                  <div className="h-3 bg-smoke rounded w-1/3 mb-3" />
                  <div className="h-4 bg-smoke rounded w-full mb-2" />
                  <div className="h-4 bg-smoke rounded w-4/5" />
                </div>
              ))}
            </div>
          )}
        </>

      ) : (
        <div className="text-center py-16 bg-white rounded-card border border-gold-subtle fade-in">
          <div className="w-16 h-16 rounded-full bg-smoke flex items-center justify-center mx-auto mb-4">
            <SearchIcon size={28} className="text-text-muted opacity-40" />
          </div>
          <h3 className="font-playfair text-xl font-bold text-text-primary mb-2">
            No results found
          </h3>
          <p className="text-[13.5px] text-text-muted max-w-[280px] mx-auto">
            Try a different keyword or browse trending topics above.
          </p>
        </div>
      )}

    </AppShell>
  );
}
