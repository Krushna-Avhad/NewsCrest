// src/pages/HatkePage.jsx
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { Pill, EmptyState } from "../components/ui/Primitives";
import { hatkeAPI } from "../services/api";
import {
  ShareIcon,
  BookmarkIcon,
  LaughIcon,
  FilterIcon,
} from "../components/ui/Icons";

const SORT_OPTIONS = ["Latest", "Category A-Z"];

function getCategories(items) {
  return ["All", ...new Set(items.map((h) => h.category).filter(Boolean))];
}

// Normalise backend hatke item to UI shape
function normaliseHatke(item) {
  return {
    id: item._id || item.id,
    original: item.title || item.original || "",
    funny:
      item.hatkeSummary || item.aiGenerated?.hatkeSummary || item.funny || "",
    category: item.category || "General",
    source: item.source || "",
  };
}

export default function HatkePage() {
  const { toggleSaveArticle, isArticleSaved } = useApp();
  const [hatkeNews, setHatkeNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Latest");
  const [showFilters, setShowFilters] = useState(false);
  const [shared, setShared] = useState({});

  useEffect(() => {
    setLoading(true);
    hatkeAPI
      .getAll()
      .then((items) => setHatkeNews(items.map(normaliseHatke)))
      .catch(() => setHatkeNews([]))
      .finally(() => setLoading(false));
  }, []);

  const ALL_CATS = getCategories(hatkeNews);

  let filtered =
    catFilter === "All"
      ? hatkeNews
      : hatkeNews.filter((h) => h.category === catFilter);
  if (sortBy === "Category A-Z")
    filtered = [...filtered].sort((a, b) =>
      a.category.localeCompare(b.category),
    );

  const handleShare = (h) => {
    const text = `NewsCrest Hatke: ${h.funny}`;
    if (navigator.share) {
      navigator
        .share({
          title: "Hatke News — NewsCrest",
          text,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setShared((prev) => ({ ...prev, [h.id]: true }));
        setTimeout(
          () => setShared((prev) => ({ ...prev, [h.id]: false })),
          2000,
        );
      });
    }
  };

  const hatkeAsArticle = (h) => ({
    id: h.id,
    title: h.original,
    category: h.category,
    source: h.source || "NewsCrest Hatke",
    time: "Just now",
    saved: false,
    summary: h.funny,
  });

  return (
    <AppShell title="Hatke">
      {/* Hero banner */}
      <div className="relative bg-gradient-to-br from-maroon to-maroon-dark rounded-[20px] p-7 mb-6 overflow-hidden slide-in-left">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 right-28 w-28 h-28 rounded-full bg-gold/10" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-[14px] bg-white/10 flex items-center justify-center flex-shrink-0">
            <LaughIcon size={28} className="text-gold" />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-gold/70 mb-1.5">
              Hatke News
            </div>
            <h2 className="font-playfair text-[26px] font-bold text-white mb-1">
              Serious news. Short and witty.
            </h2>
            <p className="text-white/60 text-[13.5px]">
              Because life is too short for boring summaries.
            </p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {ALL_CATS.map((c) => (
            <Pill
              key={c}
              active={catFilter === c}
              onClick={() => setCatFilter(c)}
            >
              {c}
            </Pill>
          ))}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] border text-[12px] font-medium cursor-pointer transition-all duration-200 ml-3 flex-shrink-0 ${showFilters ? "bg-maroon text-white border-maroon" : "bg-white text-text-secondary border-gold-subtle hover:bg-smoke"}`}
        >
          <FilterIcon size={13} /> More Filters
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-card border border-gold-subtle p-5 mb-5 panel-slide-up">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-text-muted mb-2">
              Sort By
            </div>
            <div className="flex gap-2">
              {SORT_OPTIONS.map((s) => (
                <Pill
                  key={s}
                  active={sortBy === s}
                  onClick={() => setSortBy(s)}
                >
                  {s}
                </Pill>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 text-[13px] text-text-muted">
        Showing{" "}
        <span className="font-semibold text-text-primary">
          {filtered.length}
        </span>{" "}
        hatke stories
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-card border border-gold-subtle p-5 animate-pulse"
            >
              <div className="h-3 bg-smoke rounded w-1/4 mb-3" />
              <div className="h-4 bg-smoke rounded w-full mb-2" />
              <div className="h-16 bg-lemon rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-5">
          {filtered.map((h) => {
            const article = hatkeAsArticle(h);
            const isSaved = isArticleSaved(article.id);
            return (
              <div
                key={h.id}
                className="card-reveal bg-white rounded-card border border-gold-subtle shadow-card overflow-hidden hover:shadow-card-md hover:border-gold/40 transition-all duration-200"
              >
                <div className="p-5 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-maroon bg-maroon/8 px-2.5 py-1 rounded-full">
                      {h.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleShare(h)}
                        className="w-7 h-7 rounded-full border border-gold/25 flex items-center justify-center text-text-muted hover:text-maroon hover:border-gold transition-all duration-200"
                        title="Share"
                      >
                        {shared[h.id] ? "✓" : <ShareIcon size={13} />}
                      </button>
                      <button
                        onClick={() => toggleSaveArticle(article)}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-200 ${isSaved ? "bg-maroon text-white border-maroon" : "border-gold/25 text-text-muted hover:text-maroon hover:border-gold"}`}
                        title={isSaved ? "Remove bookmark" : "Bookmark"}
                      >
                        <BookmarkIcon size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Original headline */}
                  <div className="mb-3">
                    <div className="text-[10px] font-bold uppercase tracking-[1px] text-text-muted mb-1">
                      Original
                    </div>
                    <p className="text-[13.5px] text-text-secondary leading-[1.5] line-clamp-2">
                      {h.original}
                    </p>
                  </div>
                </div>

                {/* Hatke summary */}
                <div className="mx-4 mb-4 bg-lemon border border-gold/30 rounded-[12px] p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <LaughIcon size={13} className="text-gold-muted" />
                    <span className="text-[10px] font-bold uppercase tracking-[1px] text-gold-muted">
                      Hatke Take
                    </span>
                  </div>
                  <p className="text-[13px] text-text-primary leading-[1.55]">
                    {h.funny || "AI summary coming soon..."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-card border border-gold-subtle fade-in">
          <EmptyState
            icon={<LaughIcon size={48} />}
            title="No hatke news found"
            desc="Check back later for witty news summaries."
          />
        </div>
      )}
    </AppShell>
  );
}
