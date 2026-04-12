// src/pages/SavedPage.jsx
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { SectionHeader, Pill } from "../components/ui/Primitives";
import {
  BookmarkIcon,
  TrashIcon,
  ClockIcon,
  FilterIcon,
} from "../components/ui/Icons";
import { timelineAPI } from "../services/api";

function formatSavedTime(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${diffDays}d ago`;
}

const SORT_OPTIONS = [
  "Newest First",
  "Oldest First",
  "By Category",
  "By Source",
];

export default function SavedPage() {
  const {
    openArticle,
    savedArticles,
    toggleSaveArticle,
    readingPrefs,
    setPage,
  } = useApp();
  const [catFilter, setCatFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest First");
  const [showFilters, setShowFilters] = useState(false);

  // Story updates for saved articles
  const [savedStories, setSavedStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  useEffect(() => {
    if (savedArticles.length > 0) {
      setStoriesLoading(true);
      timelineAPI
        .getMyStories()
        .then((stories) => setSavedStories(stories.slice(0, 3)))
        .catch(() => {})
        .finally(() => setStoriesLoading(false));
    }
  }, [savedArticles.length]);

  const categories = [
    "All",
    ...new Set(savedArticles.map((a) => a.category).filter(Boolean)),
  ];
  const sources = [
    "All",
    ...new Set(savedArticles.map((a) => a.source).filter(Boolean)),
  ];

  let filtered = savedArticles
    .filter((a) => catFilter === "All" || a.category === catFilter)
    .filter((a) => sourceFilter === "All" || a.source === sourceFilter);

  if (sortBy === "Newest First")
    filtered = [...filtered].sort(
      (a, b) => new Date(b.savedAt) - new Date(a.savedAt),
    );
  if (sortBy === "Oldest First")
    filtered = [...filtered].sort(
      (a, b) => new Date(a.savedAt) - new Date(b.savedAt),
    );
  if (sortBy === "By Category")
    filtered = [...filtered].sort((a, b) =>
      (a.category || "").localeCompare(b.category || ""),
    );
  if (sortBy === "By Source")
    filtered = [...filtered].sort((a, b) =>
      (a.source || "").localeCompare(b.source || ""),
    );

  return (
    <AppShell title="Saved Articles">
      <div className="flex items-center justify-between mb-5 slide-in-left">
        <div>
          <h2 className="font-playfair text-2xl font-bold text-text-primary section-title-underline inline-block">
            Saved Articles
          </h2>
          <p className="text-[13.5px] text-text-muted mt-1.5">
            {savedArticles.length} articles bookmarked
          </p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border text-[13px] font-medium cursor-pointer transition-all duration-200 ${showFilters ? "bg-maroon text-white border-maroon" : "bg-white text-text-secondary border-gold-subtle hover:bg-smoke"}`}
        >
          <FilterIcon size={14} /> Filters {showFilters ? "▲" : "▼"}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-card border border-gold-subtle p-5 mb-5 panel-slide-up space-y-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-text-muted mb-2">
              Filter by Category
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Pill
                  key={c}
                  active={catFilter === c}
                  onClick={() => setCatFilter(c)}
                >
                  {c}
                </Pill>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-text-muted mb-2">
              Filter by Source
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((s) => (
                <Pill
                  key={s}
                  active={sourceFilter === s}
                  onClick={() => setSourceFilter(s)}
                >
                  {s}
                </Pill>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-text-muted mb-2">
              Sort By
            </div>
            <div className="flex flex-wrap gap-2">
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
          {(catFilter !== "All" ||
            sourceFilter !== "All" ||
            sortBy !== "Newest First") && (
            <button
              onClick={() => {
                setCatFilter("All");
                setSourceFilter("All");
                setSortBy("Newest First");
              }}
              className="text-[12px] text-maroon font-medium hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      )}

      {!showFilters && (catFilter !== "All" || sourceFilter !== "All") && (
        <div className="flex gap-2 flex-wrap mb-4">
          {catFilter !== "All" && (
            <Pill active onClick={() => setCatFilter("All")}>
              {catFilter} ×
            </Pill>
          )}
          {sourceFilter !== "All" && (
            <Pill active onClick={() => setSourceFilter("All")}>
              {sourceFilter} ×
            </Pill>
          )}
        </div>
      )}

      <div className="mb-4 text-[13px] text-text-muted">
        Showing{" "}
        <span className="font-semibold text-text-primary">
          {filtered.length}
        </span>{" "}
        of {savedArticles.length} saved articles
      </div>

      {/* 🔄 Updates on Saved Stories */}
      {savedArticles.length > 0 &&
        (storiesLoading || savedStories.length > 0) && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-maroon"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                <h3 className="font-playfair text-[16px] font-bold text-text-primary">
                  Updates on Saved Stories
                </h3>
              </div>
              <button
                onClick={() => setPage("timeline")}
                className="text-[12px] text-maroon font-medium hover:underline cursor-pointer"
              >
                View all →
              </button>
            </div>

            {storiesLoading ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-card border border-gold-subtle p-3 animate-pulse"
                  >
                    <div className="h-3 bg-smoke rounded w-1/2 mb-2" />
                    <div className="h-4 bg-smoke rounded w-full mb-1" />
                    <div className="h-3 bg-smoke rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {savedStories.map((story) => {
                  const latest =
                    story.articles?.[story.articles.length - 1]?.articleId;
                  const newCount = story.newArticlesCount || 0;
                  return (
                    <button
                      key={story._id}
                      onClick={() => setPage("timeline")}
                      className="bg-white rounded-[12px] border border-gold-subtle p-3.5 text-left hover:border-gold/50 hover:shadow-card transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] font-bold uppercase text-maroon tracking-[0.5px]">
                          {story.category}
                        </span>
                        {newCount > 0 && (
                          <span className="text-[9px] font-bold bg-maroon text-white px-1.5 py-0.5 rounded-full animate-pulse">
                            {newCount} new
                          </span>
                        )}
                      </div>
                      <p className="text-[12.5px] font-semibold text-text-primary leading-[1.35] mb-2 line-clamp-2 group-hover:text-maroon transition-colors duration-200">
                        {story.title}
                      </p>
                      {latest && (
                        <p className="text-[11px] text-text-muted line-clamp-1">
                          Latest: {latest.title}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        {story.articles?.slice(0, 5).map((a, i) => (
                          <div key={i} className="flex items-center">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${a.isOrigin ? "bg-maroon" : "bg-gold"}`}
                            />
                            {i < Math.min(story.articles.length, 5) - 1 && (
                              <div className="w-2.5 h-[1px] bg-gold/30" />
                            )}
                          </div>
                        ))}
                        {story.articles?.length > 5 && (
                          <span className="text-[9px] text-text-muted ml-1">
                            +{story.articles.length - 5}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

      {savedArticles.length === 0 ? (
        <div className="bg-white rounded-card border border-gold-subtle text-center py-16 fade-in">
          <div className="w-14 h-14 rounded-full bg-smoke flex items-center justify-center mx-auto mb-4">
            <BookmarkIcon size={28} className="text-text-muted opacity-40" />
          </div>
          <h3 className="font-playfair text-xl font-bold text-text-primary mb-2">
            No saved articles yet
          </h3>
          <p className="text-[13.5px] text-text-muted">
            Bookmark articles from your feed to read them here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-card border border-gold-subtle text-center py-16">
          <h3 className="font-playfair text-xl font-bold text-text-primary mb-2">
            No articles match your filters
          </h3>
          <p className="text-[13.5px] text-text-muted">
            Try adjusting your filter or sort options above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="card-reveal bg-white rounded-card border border-gold-subtle shadow-card overflow-hidden cursor-pointer hover:border-gold/50 hover:shadow-card-md transition-all duration-200"
              onClick={() => openArticle(a)}
            >
              <div className="p-4 flex items-start gap-4">
                {a.imageUrl ? (
                  <img
                    src={a.imageUrl}
                    alt={a.title}
                    className="w-[72px] h-[60px] rounded-[10px] object-cover flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-[72px] h-[60px] rounded-[10px] bg-gradient-to-br from-maroon to-maroon-dark flex-shrink-0 flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="1.5"
                    >
                      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                      <path d="M18 14h-8" />
                      <path d="M15 18h-5" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[1px] text-maroon mb-1">
                    {a.category}
                  </div>
                  <h3 className="font-playfair text-[16px] font-bold text-text-primary leading-[1.35] mb-1.5">
                    {a.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11.5px] text-text-muted">
                    <span>{a.source}</span>
                    <span>·</span>
                    <span>{a.time}</span>
                    {a.readTime && (
                      <>
                        <span>·</span>
                        <ClockIcon size={11} />
                        <span>{a.readTime}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-smoke px-4 py-2.5 border-t border-gold/20 flex items-center justify-between text-[12px] text-text-muted">
                <div className="flex items-center gap-1.5">
                  <BookmarkIcon size={12} className="text-gold-muted" />
                  <span>Saved {formatSavedTime(a.savedAt)}</span>
                </div>
                <button
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-700 font-medium transition-colors duration-200 px-2 py-1 rounded-[6px] hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSaveArticle(a);
                  }}
                >
                  <TrashIcon size={13} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
