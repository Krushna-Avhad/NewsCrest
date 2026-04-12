// src/pages/CategoryDetailPage.jsx
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { NewsCard } from "../components/cards/NewsCard";
import { Button, Tabs } from "../components/ui/Primitives";
import { newsAPI } from "../services/api";
import { GridIcon } from "../components/ui/Icons";

const CAT_COLORS = {
  "Top Headlines": "#741515",
  Technology: "#1e3a5f",
  Finance: "#1a6b3a",
  Sports: "#7c3aed",
  Health: "#b91c1c",
  Science: "#0369a1",
  Business: "#92400e",
  Entertainment: "#9d174d",
  Politics: "#374151",
  Education: "#065f46",
  India: "#854d0e",
  World: "#1e40af",
  Local: "#166534",
  "Good News": "#0f766e",
  Fashion: "#86198f",
};

export default function CategoryDetailPage() {
  const { activeCat, openArticle, setPage, feedArticles, headlines } = useApp();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState("Latest");
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Map tab label to the sortBy param the backend understands
  const TAB_SORT = {
    Latest:   "date",
    Trending: "trending",
  };

  useEffect(() => {
    if (!activeCat) return;
    // Reset everything on category OR tab change
    setArticles([]);
    setPagination(null);
    setCurrentPage(1);
    setLoading(true);

    const sortBy = TAB_SORT[tab] || "date";

    newsAPI
      .getByCategory(activeCat, 1, 50, sortBy)
      .then(({ articles: fetched, pagination: pg }) => {
        setArticles(fetched);
        setPagination(pg);
      })
      .catch(() => {
        const all = [...(headlines || []), ...(feedArticles || [])].filter(
          (a, i, arr) => arr.findIndex((x) => x.id === a.id) === i,
        );
        setArticles(all.filter((a) => a.category === activeCat));
      })
      .finally(() => setLoading(false));
  }, [activeCat, tab]); // ✅ tab added here — re-fetches on every tab switch

  // Load more handler
  const loadMore = async () => {
    if (!pagination?.hasNext || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const sortBy = TAB_SORT[tab] || "date";
      const { articles: more, pagination: pg } = await newsAPI.getByCategory(
        activeCat,
        nextPage,
        50,
        sortBy, // ✅ maintain sort when loading more
      );
      setArticles((prev) => [...prev, ...more]);
      setPagination(pg);
      setCurrentPage(nextPage);
    } catch (_) {}
    setLoadingMore(false);
  };

  // Backend already returns articles sorted correctly per tab
  // Just use articles directly — no client-side re-sort needed
  const sorted = articles;

  const catColor = CAT_COLORS[activeCat] || "#741515";

  return (
    <AppShell title={activeCat}>
      {/* Hero */}
      <div
        className="rounded-[20px] p-8 mb-7 flex items-center justify-between relative overflow-hidden slide-in-left"
        style={{
          background: `linear-gradient(135deg, ${catColor}, ${catColor}99)`,
        }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 left-1/3 w-36 h-36 rounded-full bg-white/5" />
        <div className="relative z-10">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-white/50 mb-2">
            Category
          </div>
          <h2 className="font-playfair text-[32px] font-bold text-white mb-1">
            {activeCat}
          </h2>
          <p className="text-white/60 text-[13.5px]">
            {loading
              ? "Loading..."
              : `${pagination?.total ?? articles.length} stories · Updated just now`}
          </p>
        </div>
        <button
          onClick={() => setPage("categories")}
          className="flex items-center gap-2 bg-white/15 text-white border border-white/30 px-4 py-2 rounded-[10px] text-[12.5px] font-medium cursor-pointer hover:bg-white/25 transition-colors duration-200 relative z-10"
        >
          <GridIcon size={14} /> All Categories
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs tabs={["Latest", "Trending"]} active={tab} onChange={setTab} />
      </div>

      {/* Featured article */}
      {!loading && sorted[0] && (
        <div
          onClick={() => openArticle(sorted[0])}
          className="relative bg-lemon rounded-card border border-gold/35 p-6 mb-7 cursor-pointer hover:shadow-card-md transition-all duration-200 overflow-hidden panel-slide-up"
        >
          <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-gold/10" />
          <div className="absolute top-4 right-4 text-[9px] font-extrabold tracking-[2px] uppercase bg-gold text-maroon-dark px-2.5 py-1 rounded-[4px]">
            FEATURED
          </div>
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-gold-muted mb-3">
            Featured Story
          </div>
          <h3 className="font-playfair text-[22px] font-bold text-text-primary leading-[1.3] mb-2 max-w-[600px]">
            {sorted[0].title}
          </h3>
          {sorted[0].summary && (
            <p className="text-[14px] text-text-secondary leading-[1.6] mb-4 max-w-[560px]">
              {sorted[0].summary}
            </p>
          )}
          <div className="flex items-center gap-3 text-[12px] text-text-muted">
            <span>{sorted[0].source}</span>
            <span>·</span>
            <span>{sorted[0].time}</span>
            {sorted[0].readTime && (
              <>
                <span>·</span>
                <span>{sorted[0].readTime}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
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
      ) : sorted.length > 1 ? (
        <>
          <div className="grid grid-cols-3 gap-5">
            {sorted.slice(1).map((a) => (
              <div key={a.id} className="card-reveal">
                <NewsCard article={a} onClick={openArticle} />
              </div>
            ))}
          </div>

          {/* Load More */}
          {pagination?.hasNext && (
            <div className="flex flex-col items-center mt-8 gap-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-8 py-3 rounded-[12px] border border-gold/40 bg-white font-semibold text-[13px] hover:bg-lemon hover:border-gold transition-all duration-200 disabled:opacity-50"
                style={{ color: catColor }}
              >
                {loadingMore
                  ? "Loading..."
                  : `Load More · ${pagination.total - articles.length} remaining`}
              </button>
              <span className="text-[11px] text-text-muted">
                Showing {articles.length} of {pagination.total} articles
              </span>
            </div>
          )}
        </>
      ) : !sorted.length ? (
        <div className="text-center py-16 bg-white rounded-card border border-gold-subtle">
          <h3 className="font-playfair text-xl font-bold text-text-primary mb-2">
            No articles yet
          </h3>
          <p className="text-[13.5px] text-text-muted">
            Check back soon for the latest {activeCat} stories.
          </p>
        </div>
      ) : null}
    </AppShell>
  );
}
