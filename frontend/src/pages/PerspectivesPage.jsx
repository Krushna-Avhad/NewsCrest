// src/pages/PerspectivesPage.jsx
import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { perspectiveAPI, timelineAPI } from "../services/api";

// ── Persona icon map ──────────────────────────────────────────────────────────
const PERSONA_ICONS = {
  student: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  investor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  politician: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  citizen: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  it_employee: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  business: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  homemaker: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
};

const PERSONA_COLORS = {
  student:     "bg-blue-50 border-blue-200 text-blue-600",
  investor:    "bg-green-50 border-green-200 text-green-600",
  politician:  "bg-purple-50 border-purple-200 text-purple-600",
  citizen:     "bg-orange-50 border-orange-200 text-orange-600",
  it_employee: "bg-cyan-50 border-cyan-200 text-cyan-600",
  business:    "bg-amber-50 border-amber-200 text-amber-700",
  homemaker:   "bg-rose-50 border-rose-200 text-rose-600",
};

// ── Article dropdown with arrow toggle + fixed positioning ───────────────────
function ArticleDropdown({ allArticles, articlesLoading, selectedArticle, onSelect }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef          = useRef(null);
  const inputRef              = useRef(null);

  // Close on outside click — only active when open
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const portal = document.getElementById("persp-dropdown-portal");
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

  // Calculate position SYNCHRONOUSLY at click — no useEffect lag or scroll jitter
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
      <div ref={containerRef}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={handleToggle}
          className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 border-[1.5px] border-gold/30 rounded-[10px] bg-smoke text-[13px] transition-all duration-200 hover:border-gold focus:outline-none cursor-pointer"
          style={{ minHeight: 42 }}
        >
          <span className={`flex-1 text-left line-clamp-1 ${selectedArticle ? "text-text-primary font-medium" : "text-text-muted"}`}>
            {selectedArticle ? selectedArticle.title : "Select an article…"}
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

      {/* Fixed-position dropdown — escapes all overflow:hidden parents */}
      {open && (
        <div
          id="persp-dropdown-portal"
          style={{ position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-white border border-gold/30 rounded-[12px] shadow-2xl overflow-hidden"
        >
          {/* Search input */}
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

          {/* Article list — title only */}
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

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3 mt-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-[16px] border border-gold-subtle p-5 animate-pulse">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-smoke flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3.5 bg-smoke rounded w-1/4" />
              <div className="h-3 bg-smoke rounded w-full" />
              <div className="h-3 bg-smoke rounded w-4/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Single persona card ───────────────────────────────────────────────────────
function PersonaCard({ persona, isActive, onClick }) {
  const colorClass = PERSONA_COLORS[persona.id] || "bg-smoke border-gold/20 text-text-muted";
  return (
    <div
      onClick={() => onClick(persona.id)}
      className={`rounded-[16px] border-2 p-5 cursor-pointer transition-all duration-200 ${
        isActive
          ? "border-maroon shadow-card bg-maroon/3"
          : "border-gold-subtle bg-white hover:border-gold/50 hover:shadow-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-[10px] border flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          {PERSONA_ICONS[persona.id]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-bold text-text-primary font-playfair mb-1">{persona.label}</h4>
          <p className="text-[13px] text-text-secondary leading-[1.65]">{persona.text}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PerspectivesPage() {
  const { perspectivesHandoff, setPerspectivesHandoff } = useApp();

  // Article selector state
  const [allArticles, setAllArticles]         = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Perspective results
  const [perspectives, setPerspectives]     = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [activeId, setActiveId]             = useState(null);
  const [hasSearched, setHasSearched]       = useState(false);

  // Load all articles on mount + consume handoff if navigated from article page
  useEffect(() => {
    // If we arrived via "Open Full Perspectives View", pre-populate everything
    if (perspectivesHandoff) {
      setSelectedArticle(perspectivesHandoff.article);
      setPerspectives(perspectivesHandoff.perspectives || []);
      setActiveId(perspectivesHandoff.activeId || perspectivesHandoff.perspectives?.[0]?.id || null);
      setHasSearched(true);
      setPerspectivesHandoff(null); // consume and clear
    }
    timelineAPI.getAllArticles("")
      .then(items => setAllArticles(items || []))
      .catch(() => setAllArticles([]))
      .finally(() => setArticlesLoading(false));
  }, []);

  const handleSelect = (item) => {
    setSelectedArticle(item);
    // Reset results when a new article is selected
    setPerspectives([]);
    setHasSearched(false);
    setError("");
    setActiveId(null);
  };

  const handleGenerate = async () => {
    if (!selectedArticle) return;
    setLoading(true);
    setError("");
    setPerspectives([]);
    setHasSearched(true);
    try {
      const result = await perspectiveAPI.generate({
        title:       selectedArticle.title,
        description: selectedArticle.description || selectedArticle.summary || "",
        category:    selectedArticle.category    || "",
      });
      setPerspectives(result || []);
      if (result?.length > 0) setActiveId(result[0].id);
    } catch (_) {
      setError("Failed to generate perspectives. Please try again.");
    }
    setLoading(false);
  };

  const activePerspective = perspectives.find(p => p.id === activeId);

  return (
    <AppShell title="Perspectives">
      <div className="max-w-3xl mx-auto">

        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-maroon">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <h1 className="font-playfair text-[26px] font-bold text-text-primary">Perspectives</h1>
          </div>
          <p className="text-[13.5px] text-text-muted">
            See how any news article affects different groups of people — powered by AI.
          </p>
        </div>

        {/* Article selector */}
        <div className="bg-white rounded-[18px] border border-gold-subtle shadow-card p-5 mb-6">
          <label className="text-[11px] font-bold uppercase tracking-[1.5px] text-gold-muted block mb-3">
            Select an Article
          </label>

          <p className="text-[11px] text-text-muted mb-3">
            {articlesLoading ? "Loading articles…" : `${allArticles.length} articles available`}
          </p>

          <ArticleDropdown
            allArticles={allArticles}
            articlesLoading={articlesLoading}
            selectedArticle={selectedArticle}
            onSelect={handleSelect}
          />

          {/* Selected article preview */}
          {selectedArticle && (
            <div className="mt-3 bg-lemon rounded-[10px] border border-gold/25 p-3">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {selectedArticle.category && (
                  <span className="text-[9px] font-bold uppercase tracking-[0.5px] text-maroon">
                    {selectedArticle.category}
                  </span>
                )}
                {selectedArticle.source && (
                  <span className="text-[10px] text-text-muted">· {typeof selectedArticle.source === "object" ? selectedArticle.source?.name : selectedArticle.source}</span>
                )}
                {selectedArticle.publishedAt && (
                  <span className="text-[10px] text-text-muted">
                    · {new Date(selectedArticle.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
              <p className="text-[13px] font-semibold text-text-primary leading-[1.4] line-clamp-2">
                {selectedArticle.title}
              </p>
              {selectedArticle.description && (
                <p className="text-[12px] text-text-secondary mt-1 line-clamp-1">
                  {selectedArticle.description}
                </p>
              )}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedArticle || loading}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-maroon text-white text-[13px] font-bold rounded-[12px] hover:bg-maroon-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Analysing article…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Generate Perspectives
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {loading && <Skeleton />}

        {!loading && error && (
          <div className="bg-white rounded-card border border-red-200 p-6 text-center">
            <p className="text-[13px] font-semibold text-red-600 mb-2">{error}</p>
            <button onClick={handleGenerate} className="text-[12px] text-maroon hover:underline cursor-pointer">
              Try again
            </button>
          </div>
        )}

        {!loading && hasSearched && !error && perspectives.length === 0 && (
          <div className="bg-white rounded-card border border-gold-subtle p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-smoke flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <p className="text-[14px] font-semibold text-text-primary mb-1">No perspectives available</p>
            <p className="text-[13px] text-text-muted">
              This article does not appear to have a direct impact on specific groups.
            </p>
          </div>
        )}

        {!loading && perspectives.length > 0 && (
          <>
            {/* Active perspective spotlight */}
            {activePerspective && (
              <div className="bg-white rounded-[18px] border-2 border-maroon/20 shadow-card p-6 mb-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-[12px] border flex items-center justify-center flex-shrink-0 ${PERSONA_COLORS[activePerspective.id] || "bg-smoke border-gold/20 text-text-muted"}`}>
                    {PERSONA_ICONS[activePerspective.id]}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-gold-muted">Viewing as</p>
                    <p className="text-[19px] font-bold text-text-primary font-playfair">{activePerspective.label}</p>
                  </div>
                </div>
                <p className="text-[15px] text-text-secondary leading-[1.75]">{activePerspective.text}</p>
              </div>
            )}

            {/* All cards */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-text-muted mb-3">
                {perspectives.length} group{perspectives.length !== 1 ? "s" : ""} affected
              </p>
              <div className="grid grid-cols-1 gap-3">
                {perspectives.map(p => (
                  <PersonaCard
                    key={p.id}
                    persona={p}
                    isActive={p.id === activeId}
                    onClick={setActiveId}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-gold/20 text-center">
              <p className="text-[12px] text-text-muted">
                Perspectives are generated by AI and reflect the article's actual content.
                Only groups with a direct, specific impact are shown.
              </p>
            </div>
          </>
        )}

        {/* Empty state — nothing selected yet */}
        {!hasSearched && !loading && !selectedArticle && (
          <div className="bg-white rounded-card border border-gold-subtle p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-smoke flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-text-primary mb-2 font-playfair">
              Choose an article above
            </p>
            <p className="text-[13px] text-text-muted">
              Select any article from the dropdown and click Generate Perspectives
              to see how it affects different groups of people.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
