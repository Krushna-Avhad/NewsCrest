// src/pages/StoryTimelinePage.jsx
import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { timelineAPI } from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT STYLES
// ─────────────────────────────────────────────────────────────────────────────
const EVENT_STYLES = {
  Origin:      { dot: "bg-maroon",     badge: "bg-maroon text-white" },
  Breaking:    { dot: "bg-red-600",    badge: "bg-red-600 text-white" },
  Update:      { dot: "bg-gold",       badge: "bg-gold/20 text-gold-muted border border-gold/40" },
  Announced:   { dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700" },
  Development: { dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700" },
  Reaction:    { dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-700" },
  Outcome:     { dot: "bg-green-500",  badge: "bg-green-100 text-green-800" },
  Resolution:  { dot: "bg-green-600",  badge: "bg-green-100 text-green-800" },
  Saved:       { dot: "bg-gold",       badge: "bg-lemon text-gold-muted border border-gold/30" },
  "From History": { dot: "bg-tan",     badge: "bg-smoke text-text-secondary" },
  default:     { dot: "bg-text-muted", badge: "bg-smoke text-text-secondary" },
};
const getStyle = (label) => EVENT_STYLES[label] || EVENT_STYLES.default;

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-card border border-gold-subtle p-4 animate-pulse">
          <div className="flex gap-3.5">
            <div className="w-16 h-16 rounded-[10px] bg-smoke flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 bg-smoke rounded w-1/4" />
              <div className="h-4 bg-smoke rounded w-full" />
              <div className="h-3 bg-smoke rounded w-3/4" />
              <div className="flex gap-1 pt-1">
                {[1,2,3,4].map(j => <div key={j} className="w-2 h-2 rounded-full bg-smoke" />)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE TIMELINE EVENT ROW
// ─────────────────────────────────────────────────────────────────────────────
function TimelineEvent({ entry, isLast, onArticleClick, isNew }) {
  const article = entry.articleId;
  if (!article?.title) return null;
  const style = getStyle(entry.eventLabel);

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-3.5 h-3.5 rounded-full z-10 mt-1 transition-transform duration-200 group-hover:scale-125 ${style.dot}`} />
        {!isLast && <div className="w-[2px] flex-1 bg-gold/20 mt-1 min-h-[32px]" />}
      </div>

      <div
        className={`flex-1 mb-5 bg-white rounded-[14px] border overflow-hidden cursor-pointer hover:shadow-card-md transition-all duration-200 ${
          isNew ? "border-gold/60 ring-1 ring-gold/20" : "border-gold-subtle"
        }`}
        onClick={() => onArticleClick(article)}
      >
        {isNew && (
          <div className="bg-lemon px-3 py-1.5 border-b border-gold/20 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="text-[10px] font-bold text-gold-muted uppercase tracking-[1px]">New Update</span>
          </div>
        )}

        <div className="p-4 flex gap-3">
          {article.imageUrl && (
            <img
              src={article.imageUrl} alt={article.title}
              className="w-[72px] h-[56px] rounded-[8px] object-cover flex-shrink-0"
              onError={e => { e.target.style.display = "none"; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[9px] font-bold uppercase tracking-[1px] px-2 py-0.5 rounded-[5px] ${style.badge}`}>
                {entry.eventLabel || "Update"}
              </span>
              <span className="text-[11px] text-text-muted">{timeAgo(article.publishedAt)}</span>
              <span className="text-[11px] text-text-muted">·</span>
              <span className="text-[11px] text-text-muted">{fmtDate(article.publishedAt)}</span>
            </div>
            <h4 className="font-playfair text-[15px] font-bold text-text-primary leading-[1.35] mb-1 group-hover:text-maroon transition-colors duration-200 line-clamp-2">
              {article.title}
            </h4>
            {article.summary && (
              <p className="text-[12.5px] text-text-secondary leading-[1.5] line-clamp-2">{article.summary}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-text-muted">
              <span className="font-medium">
                {typeof article.source === "object" ? article.source?.name : article.source}
              </span>
              {article.readTime && <><span>·</span><span>{article.readTime} min read</span></>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STORY DETAIL PANEL
// ─────────────────────────────────────────────────────────────────────────────
function StoryDetailPanel({ story, onBack, onArticleClick, userReadIds }) {
  if (!story) return null;

  const articles = story.articles?.filter(a => a.articleId?.title) || [];
  const sorted = [...articles].sort(
    (a, b) => new Date(a.articleId.publishedAt || a.addedAt) - new Date(b.articleId.publishedAt || b.addedAt)
  );
  const isLocalFallback = story.isLocalFallback;
  const isManualInput   = story.isManualInput;

  return (
    <div className="panel-slide-up">
      {/* Back + title row */}
      <div className="flex items-start gap-3 mb-5">
        <button
          onClick={onBack}
          className="mt-1 p-2 rounded-[10px] bg-smoke hover:bg-wheat transition-colors duration-200 flex-shrink-0 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {story.category && (
              <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-maroon">{story.category}</span>
            )}
            <span className="text-[10px] text-text-muted">· {articles.length} events</span>
            {isLocalFallback && (
              <span className="text-[9px] font-bold bg-lemon text-gold-muted border border-gold/30 px-2 py-0.5 rounded-full">
                Offline mode
              </span>
            )}
            {isManualInput && (
              <span className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                Generated search
              </span>
            )}
          </div>
          <h2 className="font-playfair text-[21px] font-bold text-text-primary leading-[1.3]">
            {story.title}
          </h2>
        </div>
      </div>

      {/* Keywords */}
      {story.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {story.keywords.slice(0, 8).map((k, i) => (
            <span key={i} className="text-[10px] bg-smoke text-text-secondary px-2 py-1 rounded-full border border-gold/20">
              {k}
            </span>
          ))}
        </div>
      )}

      {/* Timeline events */}
      <div className="relative">
        {sorted.map((entry, i) => (
          <TimelineEvent
            key={entry.articleId?._id || i}
            entry={entry}
            isLast={i === sorted.length - 1}
            onArticleClick={onArticleClick}
            isNew={
              !isLocalFallback &&
              !isManualInput &&
              !userReadIds?.includes(entry.articleId?._id?.toString())
            }
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STORY LIST ITEM
// ─────────────────────────────────────────────────────────────────────────────
function StoryListItem({ story, onClick, onDelete }) {
  const articles = story.articles?.filter(a => a.articleId?.title) || [];
  const latest   = articles[articles.length - 1]?.articleId;
  const newCount = story.newArticlesCount || 0;

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(story._id);
  };

  return (
    <div
      className="card-reveal bg-white rounded-card border border-gold-subtle shadow-card overflow-hidden cursor-pointer hover:border-gold/50 hover:shadow-card-md transition-all duration-200 group"
      onClick={() => onClick(story)}
    >
      <div className="p-4 flex gap-3.5">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-[62px] h-[62px] rounded-[10px] overflow-hidden bg-gradient-to-br from-maroon to-maroon-dark flex items-center justify-center">
          {latest?.imageUrl ? (
            <img
              src={latest.imageUrl} alt=""
              className="w-full h-full object-cover"
              onError={e => { e.target.style.display = "none"; }}
            />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {story.category && (
              <span className="text-[9px] font-bold text-maroon uppercase tracking-[1px]">{story.category}</span>
            )}
            {story.isSavedStory && (
              <span className="text-[9px] font-bold bg-gold/15 text-gold-muted border border-gold/30 px-1.5 py-0.5 rounded-full">Saved</span>
            )}
            {newCount > 0 && (
              <span className="text-[9px] font-bold bg-maroon text-white px-1.5 py-0.5 rounded-full">{newCount} new</span>
            )}
            {story.isLocalFallback && (
              <span className="text-[9px] bg-lemon text-gold-muted border border-gold/30 px-1.5 py-0.5 rounded-full">Offline</span>
            )}
          </div>
          <h3 className="font-playfair text-[14.5px] font-bold text-text-primary leading-[1.3] mb-1.5 group-hover:text-maroon transition-colors duration-200 line-clamp-2">
            {story.title}
          </h3>
          {/* Mini dot timeline */}
          <div className="flex items-center gap-1 mb-1.5">
            {articles.slice(0, 6).map((a, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${a.isOrigin ? "bg-maroon" : "bg-gold"}`} />
                {i < Math.min(articles.length, 6) - 1 && (
                  <div className="w-3 h-[1.5px] bg-gold/30" />
                )}
              </div>
            ))}
            {articles.length > 6 && (
              <span className="text-[10px] text-text-muted ml-1">+{articles.length - 6}</span>
            )}
          </div>
          <span className="text-[11px] text-text-muted">
            {articles.length} events · {timeAgo(story.lastUpdatedAt)}
          </span>
        </div>

        <div className="flex-shrink-0 self-center flex flex-col items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted group-hover:text-maroon transition-colors duration-200">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <button
            onClick={handleDelete}
            title="Remove from timeline"
            className="p-1.5 rounded-[6px] text-text-muted hover:text-red-500 hover:bg-red-50 transition-all duration-150 cursor-pointer opacity-0 group-hover:opacity-100"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
function ArticleDropdown({ allArticles, articlesLoading, selectedArticle, onSelect, placeholder }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef          = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const portal = document.getElementById("article-dropdown-portal");
      if (
        (containerRef.current && containerRef.current.contains(e.target)) ||
        (portal && portal.contains(e.target))
      ) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = query.trim()
    ? allArticles.filter(a => a.title?.toLowerCase().includes(query.toLowerCase()))
    : allArticles;

  const handleToggle = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(v => !v);
    setQuery("");
  };

  const handleSelect = (item) => {
    onSelect(item);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={handleToggle}
          className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 border-[1.5px] border-gold/30 rounded-[10px] bg-smoke text-[13px] transition-all duration-200 hover:border-gold focus:outline-none cursor-pointer"
          style={{ minHeight: 42 }}
        >
          <span className={`flex-1 text-left line-clamp-1 ${selectedArticle ? "text-text-primary font-medium" : "text-text-muted"}`}>
            {selectedArticle ? selectedArticle.title : (placeholder || "Select an article…")}
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            className={`flex-shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

      {open && (
        <div
          id="article-dropdown-portal"
          style={{ position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-white border border-gold/30 rounded-[12px] shadow-2xl overflow-hidden"
        >
          <div className="p-2 border-b border-gold/15">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search articles…"
                className="w-full pl-7 pr-3 py-1.5 text-[12.5px] bg-smoke rounded-[8px] outline-none border border-transparent focus:border-gold/30 placeholder:text-text-muted text-text-primary"
              />
              {articlesLoading && (
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-text-muted" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              )}
            </div>
          </div>

          <div className="max-h-[260px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-[12px] text-text-muted text-center py-4">
                {query ? "No articles match your search" : articlesLoading ? "Loading…" : "No articles available"}
              </p>
            ) : (
              filtered.map(item => (
                <button
                  key={item.articleId}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-3.5 py-2.5 text-[12.5px] border-b border-gold/10 last:border-0 transition-colors duration-100 cursor-pointer leading-[1.4] ${
                    selectedArticle?.articleId?.toString() === item.articleId?.toString()
                      ? "bg-lemon text-text-primary font-semibold"
                      : "text-text-primary hover:bg-smoke"
                  }`}
                >
                  {item.title}
                </button>
              ))
            )}
          </div>
          {filtered.length > 0 && (
            <div className="px-3 py-1.5 border-t border-gold/10 bg-smoke/40">
              <p className="text-[10px] text-text-muted">{filtered.length} article{filtered.length !== 1 ? "s" : ""}{query ? " found" : " available"}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE TIMELINE PANEL
// ─────────────────────────────────────────────────────────────────────────────
function GeneratePanel({ onStoryGenerated, user }) {
  const [mode, setMode]                       = useState("input");
  const [inputText, setInputText]             = useState("");
  const [generating, setGenerating]           = useState(false);
  const [errorMsg, setErrorMsg]               = useState("");
  const [allArticles, setAllArticles]         = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const textareaRef                           = useRef(null);

  useEffect(() => {
    if (mode === "select" && allArticles.length === 0) {
      setArticlesLoading(true);
      timelineAPI.getAllArticles("")
        .then(items => setAllArticles(items))
        .catch(() => setAllArticles([]))
        .finally(() => setArticlesLoading(false));
    }
  }, [mode]);

  const handleInputGenerate = async () => {
    if (!inputText.trim()) return;
    setGenerating(true);
    setErrorMsg("");
    try {
      const { story, message } = await timelineAPI.generateFromInput(inputText.trim());
      if (story && story.articles?.length > 0) {
        onStoryGenerated(story);
      } else {
        setErrorMsg(message || "No closely related articles found. Try a more specific headline.");
      }
    } catch (_) {
      setErrorMsg("Something went wrong. Please try again.");
    }
    setGenerating(false);
  };

  const handleSelectGenerate = async () => {
    if (!selectedArticle) return;
    setGenerating(true);
    setErrorMsg("");
    try {
      const { story, message } = await timelineAPI.generateFromHistory({
        articleId:   selectedArticle.articleId,
        title:       selectedArticle.title,
        description: selectedArticle.description,
      });
      if (story && story.articles?.length > 0) {
        onStoryGenerated(story);
      } else {
        setErrorMsg(message || "No related articles found for this story.");
      }
    } catch (_) {
      setErrorMsg("Something went wrong. Please try again.");
    }
    setGenerating(false);
  };

  return (
    <div className="bg-white rounded-card border border-gold-subtle shadow-card mb-5">
      <div className="bg-gradient-to-r from-lemon to-white px-5 py-3.5 border-b border-gold/20">
        <div className="flex items-center gap-2 mb-0.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-maroon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-gold-muted">Generate Timeline</span>
        </div>
        <p className="text-[12px] text-text-secondary">
          Paste a headline or select an article to build its story arc
        </p>
      </div>

      <div className="flex border-b border-gold/15">
        {[
          { id: "input",  label: "Paste Headline" },
          { id: "select", label: "Select Article"  },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setErrorMsg(""); }}
            className={`flex-1 py-2.5 text-[12px] font-semibold transition-all duration-200 cursor-pointer ${
              mode === m.id
                ? "bg-maroon/5 text-maroon border-b-2 border-maroon"
                : "text-text-muted hover:text-text-primary hover:bg-smoke"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {mode === "input" && (
          <>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleInputGenerate(); }}
              placeholder="Search news topics (e.g. global conflicts, technology updates, economic policies)"
              rows={3}
              className="w-full px-3.5 py-2.5 border-[1.5px] border-gold/25 rounded-[10px] text-[13px] text-text-primary bg-smoke outline-none focus:border-gold resize-none leading-[1.6] placeholder:text-text-muted transition-all duration-200"
            />
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[10px] text-text-muted">Ctrl+Enter to generate · Returns only closely matched articles</span>
              <button
                onClick={handleInputGenerate}
                disabled={!inputText.trim() || generating}
                className="flex items-center gap-2 px-4 py-2 bg-maroon text-white text-[12px] font-bold rounded-[10px] hover:bg-maroon-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Generating…
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Build Timeline
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {mode === "select" && (
          <>
            <p className="text-[11px] text-text-muted mb-2">
              {allArticles.length > 0 ? `${allArticles.length} articles available` : articlesLoading ? "Loading articles…" : "No articles found"}
            </p>

            <ArticleDropdown
              allArticles={allArticles}
              articlesLoading={articlesLoading}
              selectedArticle={selectedArticle}
              onSelect={setSelectedArticle}
              placeholder="Select an article to build its timeline…"
            />

            {selectedArticle && (
              <div className="bg-lemon rounded-[10px] border border-gold/25 p-3 mt-3 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  {selectedArticle.category && (
                    <span className="text-[9px] font-bold uppercase text-maroon tracking-[0.5px]">
                      {selectedArticle.category}
                    </span>
                  )}
                  <span className="text-[10px] text-text-muted">· {timeAgo(selectedArticle.publishedAt)}</span>
                  {selectedArticle.source && (
                    <span className="text-[10px] text-text-muted">· {selectedArticle.source}</span>
                  )}
                </div>
                <p className="text-[12.5px] font-semibold text-text-primary line-clamp-2 mb-0.5">
                  {selectedArticle.title}
                </p>
                {selectedArticle.description && (
                  <p className="text-[11px] text-text-secondary line-clamp-1">{selectedArticle.description}</p>
                )}
              </div>
            )}

            <button
              onClick={handleSelectGenerate}
              disabled={!selectedArticle || generating}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-maroon text-white text-[12px] font-bold rounded-[10px] hover:bg-maroon-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer mt-3"
            >
              {generating ? (
                <>
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Building Timeline…
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Build Timeline for This Article
                </>
              )}
            </button>
          </>
        )}

        {errorMsg && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-[10px] px-3 py-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-[12px] text-red-700">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function StoryTimelinePage() {
  const { openArticle, user, savedArticles } = useApp();

  const [myStories, setMyStories]         = useState([]);
  const [savedStories, setSavedStories]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedStory, setSelectedStory] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const prevSavedCountRef                 = useRef(0);
  const retryTimerRef                     = useRef(null);

  const userReadIds = (user?.readingHistory || []).map(r => r.articleId?.toString());

  useEffect(() => { loadStories(); }, [user]);

  const fetchSavedTimelines = async (ids) => {
    if (!ids?.length) { setSavedStories([]); return; }
    try {
      const stories = await timelineAPI.getStoriesForSaved(ids);
      setSavedStories(stories.map(s => ({ ...s, isSavedStory: true })));
    } catch (_) {}
  };

  useEffect(() => {
    if (!savedArticles?.length) { setSavedStories([]); prevSavedCountRef.current = 0; return; }
    const ids = savedArticles.map(a => a.id || a._id).filter(Boolean);
    if (!ids.length) return;

    fetchSavedTimelines(ids);

    if (savedArticles.length > prevSavedCountRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => fetchSavedTimelines(ids), 5000);
    }
    prevSavedCountRef.current = savedArticles.length;

    return () => clearTimeout(retryTimerRef.current);
  }, [savedArticles]);

  const loadStories = async () => {
    setLoading(true);
    try {
      if (user) {
        const mine = await timelineAPI.getMyStories();
        setMyStories(mine);
      }
    } catch (_) {}
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const ids = savedArticles.map(a => a.id || a._id).filter(Boolean);
      await Promise.all([loadStories(), fetchSavedTimelines(ids)]);
    } catch (_) {}
    setRefreshing(false);
  };

  const handleDeleteStory = async (storyId) => {
    setMyStories(prev => prev.filter(s => s._id !== storyId));
    setSavedStories(prev => prev.filter(s => s._id !== storyId));
    try {
      await timelineAPI.dismissStory(storyId);
    } catch (_) {
      const ids = savedArticles.map(a => a.id || a._id).filter(Boolean);
      await Promise.all([loadStories(), fetchSavedTimelines(ids)]);
    }
  };

  const handleOpenStory = async (story) => {
    if (story.isLocalFallback || story.isManualInput) {
      setSelectedStory(story);
      return;
    }
    if (!story.articles?.[0]?.articleId?.title) {
      try {
        const full = await timelineAPI.getStory(story._id);
        setSelectedStory(full || story);
      } catch (_) { setSelectedStory(story); }
    } else {
      setSelectedStory(story);
    }
  };

  const handleArticleClick = (article) => {
    if (article?.id || article?._id) {
      openArticle({ ...article, id: article.id || article._id });
    }
  };

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selectedStory) {
    return (
      <AppShell title="Story Timeline">
        <StoryDetailPanel
          story={selectedStory}
          onBack={() => setSelectedStory(null)}
          onArticleClick={handleArticleClick}
          userReadIds={userReadIds}
        />
      </AppShell>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  const myIds       = new Set(myStories.map(s => s._id?.toString()));
  const uniqueSaved = savedStories.filter(s => !myIds.has(s._id?.toString()));
  const totalCount  = myStories.length + uniqueSaved.length;

  return (
    <AppShell title="Story Timeline">

      {/* Hero banner */}
      <div className="relative bg-gradient-to-br from-maroon to-maroon-dark rounded-[20px] p-6 mb-5 overflow-hidden slide-in-left">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 right-24 w-28 h-28 rounded-full bg-gold/10" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="text-[10px] font-bold tracking-[2px] uppercase text-gold/80">Story Continuity</span>
            </div>
            <h2 className="font-playfair text-[24px] font-bold text-white mb-1">What Happened Next?</h2>
            <p className="text-white/60 text-[13px]">Follow the full arc of stories you care about</p>
          </div>
          <button
            onClick={() => setShowGenerator(v => !v)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-200 cursor-pointer ${
              showGenerator
                ? "bg-white text-maroon"
                : "bg-white/15 text-white border border-white/25 hover:bg-white/25"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {showGenerator ? "Hide" : "Search Story"}
          </button>
        </div>
      </div>

      {/* Generate panel (collapsible) */}
      {showGenerator && (
        <GeneratePanel
          onStoryGenerated={(story) => { setSelectedStory(story); setShowGenerator(false); }}
          user={user}
        />
      )}

      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-playfair text-[19px] font-bold text-text-primary">Continue This Story</h3>
          <p className="text-[12.5px] text-text-muted mt-0.5">
            {user ? "Threads based on your reading activity" : "Sign in to see your personalised story threads"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <span className="text-[11px] text-text-muted">{totalCount} active threads</span>
          )}
          {user && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh timelines"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold text-text-muted hover:text-maroon hover:bg-smoke border border-gold/20 transition-all duration-200 cursor-pointer disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? "animate-spin" : ""}>
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </div>
      </div>

      {/* Sign-in state */}
      {!user && (
        <div className="bg-white rounded-card border border-gold-subtle text-center py-12">
          <div className="w-14 h-14 rounded-full bg-smoke flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted opacity-50">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h3 className="font-playfair text-xl font-bold text-text-primary mb-2">Sign in to track stories</h3>
          <p className="text-[13.5px] text-text-muted">
            Log in to see updates on news you've read or saved.
            <br />Use "Search Story" above to generate a timeline without signing in.
          </p>
        </div>
      )}

      {/* Empty state */}
      {user && !loading && myStories.length === 0 && savedStories.length === 0 && (
        <div className="bg-lemon rounded-card border border-gold/30 p-4 mb-5 flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold-muted flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p className="text-[13px] font-semibold text-text-primary mb-0.5">No story threads yet</p>
            <p className="text-[12px] text-text-secondary">
              Read or save articles to build story continuity automatically.
              Or use the "Search Story" button above to generate one right now.
            </p>
          </div>
        </div>
      )}

      {/* Story list */}
      {loading && user ? (
        <SkeletonList />
      ) : user && totalCount > 0 ? (
        <div className="space-y-3">
          {myStories.length > 0 && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-text-muted px-1 pt-1">
                From your reading history
              </p>
              {myStories.map((story, i) => (
                <StoryListItem
                  key={story._id || i}
                  story={story}
                  onClick={handleOpenStory}
                  onDelete={handleDeleteStory}
                />
              ))}
            </>
          )}
          {uniqueSaved.length > 0 && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-text-muted px-1 pt-2">
                From your saved articles
              </p>
              {uniqueSaved.map((story, i) => (
                <StoryListItem
                  key={story._id || i}
                  story={story}
                  onClick={handleOpenStory}
                  onDelete={handleDeleteStory}
                />
              ))}
            </>
          )}
        </div>
      ) : null}

    </AppShell>
  );
}