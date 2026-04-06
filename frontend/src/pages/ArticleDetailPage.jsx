// src/pages/ArticleDetailPage.jsx
import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { NewsCard } from "../components/cards/NewsCard";
import { Button, NewsTag } from "../components/ui/Primitives";
import { newsAPI, hatkeAPI, timelineAPI, perspectiveAPI } from "../services/api";
import {
  BookmarkIcon,
  ShareIcon,
  ClockIcon,
  ZapIcon,
  BotIcon,
  LaughIcon,
  ScaleIcon,
  NoteIcon,
  CalendarIcon,
  CheckIcon,
} from "../components/ui/Icons";

const TEXT_SIZES = {
  Small: "text-[14px]",
  Medium: "text-[16px]",
  Large: "text-[18px]",
};

const DEFAULT_SOURCE_INFO =
  "This is a verified and credible media source known for accurate, fact-checked reporting across its primary coverage areas.";

export default function ArticleDetailPage() {
  const {
    activeArticle,
    openArticle,
    openCompareWith,
    addNote,
    toggleSaveArticle,
    isArticleSaved,
    readingPrefs,
    feedArticles,
    headlines,
  } = useApp();

  const article = activeArticle;
  const saved = isArticleSaved(article?.id);
  const textSize = TEXT_SIZES[readingPrefs?.textSize] || TEXT_SIZES.Medium;

  // Related articles from feed (same category)
  const related = [...(headlines || []), ...(feedArticles || [])]
    .filter((a) => a.id !== article?.id && a.category === article?.category)
    .slice(0, 3);

  // AI summary state
  const [summaryGenerated, setSummaryGenerated] = useState(!!article?.summary);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(article?.summary || "");

  // Hatke summary
  const [hatkeText, setHatkeText] = useState(article?.hatkeSummary || "");
  const [hatkeLoading, setHatkeLoading] = useState(false);

  // Perspectives
  const [perspectives, setPerspectives] = useState([]);
  const [perspectivesLoading, setPerspectivesLoading] = useState(false);
  const [perspectivesVisible, setPerspectivesVisible] = useState(false);
  const [perspectiveActive, setPerspectiveActive] = useState(null);

  // Story Timeline
  const [storyTimeline, setStoryTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    if (article) {
      setSummaryGenerated(!!article.summary);
      setAiSummary(article.summary || "");
      setHatkeText(article.hatkeSummary || "");
      hatkeCalledRef.current = false;
      summaryCalledRef.current = false;
      setStoryTimeline(null);
      setPerspectives([]);
      setPerspectivesVisible(false);
      setPerspectiveActive(null);
      // Fetch story timeline for this article
      if (article.id) {
        setTimelineLoading(true);
        timelineAPI
          .getArticleTimeline(article.id)
          .then(story => setStoryTimeline(story))
          .catch(() => {})
          .finally(() => setTimelineLoading(false));
      }
    }
  }, [article?.id]);

  const summaryCalledRef = useRef(false);

  const generateSummary = async () => {
    if (!article?.id) return;
    if (summaryCalledRef.current) return;
    summaryCalledRef.current = true;
    setSummaryLoading(true);
    try {
      const data = await newsAPI.getById(article.id);
      setAiSummary(data?.summary || article?.summary || "");
      setSummaryGenerated(true);
    } catch (_) {
      setAiSummary(article?.summary || "Summary unavailable.");
      setSummaryGenerated(true);
    }
    setSummaryLoading(false);
  };

  const hatkeCalledRef = useRef(false);

  const generateHatke = async () => {
    if (!article?.id) return;
    if (hatkeCalledRef.current) return;
    hatkeCalledRef.current = true;
    setHatkeLoading(true);
    try {
      const data = await hatkeAPI.generateForArticle(article.id);
      setHatkeText(data?.hatkeSummary || data?.summary || "");
    } catch (_) {}
    setHatkeLoading(false);
  };

  const handleViewPerspectives = async () => {
    // If already loaded, just toggle visibility
    if (perspectives.length > 0) {
      setPerspectivesVisible(v => !v);
      return;
    }
    setPerspectivesVisible(true);
    setPerspectivesLoading(true);
    try {
      const result = await perspectiveAPI.generate({
        title:       article.title,
        description: article.summary || article.content || "",
        category:    article.category,
      });
      setPerspectives(result);
      if (result.length > 0) setPerspectiveActive(result[0].id);
    } catch (_) {
      setPerspectives([]);
    }
    setPerspectivesLoading(false);
  };

  // Share
  const [shareMsg, setShareMsg] = useState("");
  const handleShare = () => {
    const text = `${article?.title} — Read on NewsCrest`;
    if (navigator.share) {
      navigator
        .share({
          title: article?.title,
          text,
          url: article?.url || window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(article?.url || text).then(() => {
        setShareMsg("Link copied!");
        setTimeout(() => setShareMsg(""), 2000);
      });
    }
  };

  // Note
  const [noteContent, setNoteContent] = useState("");
  const [noteDue, setNoteDue] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  const handleSaveNote = () => {
    if (!noteContent.trim()) return;
    addNote({
      title: `Note on: ${article?.title?.slice(0, 40)}...`,
      content: noteContent,
      pinned: false,
      done: false,
      status: "inprogress",
      due: noteDue || null,
      articleTitle: article?.title,
      articleId: article?.id,
    });
    setNoteSaved(true);
    setTimeout(() => {
      setNoteSaved(false);
      setNoteContent("");
      setNoteDue("");
    }, 3000);
  };

  if (!article) {
    return (
      <AppShell title="Article">
        <div className="text-center py-20 text-text-muted">
          No article selected.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Article">
      <div className="grid grid-cols-[1fr_360px] gap-7">
        {/* Main content */}
        <div className="slide-in-left">
          {/* Category + meta */}
          <div className="flex items-center gap-3 mb-5">
            <NewsTag>{article.category}</NewsTag>
            {article.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2.5 py-1 rounded-full border border-gold/25 text-text-muted bg-white"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="font-playfair text-[30px] font-bold text-text-primary leading-[1.25] mb-4">
            {article.title}
          </h1>

          {/* Meta row */}
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gold/20">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-maroon/10 flex items-center justify-center text-maroon font-bold text-[11px]">
                {(article.source || "N")[0]}
              </div>
              <div>
                <div className="text-[12px] font-semibold text-text-primary">
                  {article.source}
                </div>
                {article.author && (
                  <div className="text-[10px] text-text-muted">
                    {article.author}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-text-muted">
              <ClockIcon size={12} />
              <span>{article.time}</span>
              {article.readTime && (
                <>
                  <span>·</span>
                  <span>{article.readTime}</span>
                </>
              )}
            </div>
            {article.sentiment && (
              <span
                className={`text-[10px] font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-full ${
                  article.sentiment === "positive"
                    ? "bg-green-500/10 text-green-700"
                    : article.sentiment === "negative"
                      ? "bg-red-500/10 text-red-600"
                      : "bg-smoke text-text-muted"
                }`}
              >
                {article.sentiment}
              </span>
            )}
          </div>

          {/* Article image */}
          {article.imageUrl && (
            <div className="mb-5 rounded-[16px] overflow-hidden">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-[280px] object-cover"
                onError={(e) => {
                  e.target.parentElement.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Article body */}
          <div
            className={`${textSize} text-text-secondary leading-[1.8] space-y-4 mb-6`}
          >
            {article.content ? (
              article.content
                .split("\n\n")
                .filter(Boolean)
                .map((para, i) => <p key={i}>{para}</p>)
            ) : article.summary ? (
              <p>{article.summary}</p>
            ) : (
              <p className="text-text-muted italic">
                Full article content not available. Visit the source for the
                complete story.
              </p>
            )}
          </div>

          {/* Source link */}
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] text-maroon font-medium hover:underline mb-6"
            >
              Read full article at {article.source} →
            </a>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2 mb-8 pb-6 border-b border-gold/20">
            <Button
              variant={saved ? "primary" : "secondary"}
              size="sm"
              onClick={() => toggleSaveArticle(article)}
            >
              <BookmarkIcon size={15} /> {saved ? "Saved" : "Save"}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleShare}>
              <ShareIcon size={15} /> {shareMsg || "Share"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openCompareWith(article)}
            >
              <ScaleIcon size={15} /> Compare
            </Button>
            <Button
              variant={perspectivesVisible ? "primary" : "outline"}
              size="sm"
              onClick={handleViewPerspectives}
              disabled={perspectivesLoading}
            >
              {perspectivesLoading ? (
                <span className="animate-spin inline-block">⟳</span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
              {perspectivesLoading ? "Loading…" : perspectivesVisible ? "Hide Perspectives" : "View Perspectives"}
            </Button>
          </div>

          {/* 👁 Perspectives Panel */}
          {perspectivesVisible && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-maroon">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <h3 className="font-playfair text-[19px] font-bold text-text-primary">
                  View Through Different Lenses
                </h3>
              </div>

              {perspectivesLoading ? (
                /* Skeleton */
                <div className="bg-white rounded-card border border-gold-subtle overflow-hidden">
                  <div className="flex gap-2 p-3 border-b border-gold/15 overflow-x-auto">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="h-8 w-24 rounded-full bg-smoke animate-pulse flex-shrink-0" />
                    ))}
                  </div>
                  <div className="p-5">
                    <div className="h-4 bg-smoke rounded w-3/4 mb-2 animate-pulse" />
                    <div className="h-4 bg-smoke rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ) : perspectives.length > 0 ? (
                <div className="bg-white rounded-card border border-gold-subtle shadow-card overflow-hidden">
                  {/* Persona tab strip */}
                  <div className="flex gap-1.5 p-3 border-b border-gold/15 overflow-x-auto">
                    {perspectives.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPerspectiveActive(p.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-150 cursor-pointer ${
                          perspectiveActive === p.id
                            ? "bg-maroon text-white"
                            : "bg-smoke text-text-secondary hover:bg-wheat hover:text-text-primary"
                        }`}
                      >
                        <span>{p.emoji}</span>
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Active perspective content */}
                  {(() => {
                    const active = perspectives.find(p => p.id === perspectiveActive);
                    if (!active) return null;
                    return (
                      <div className="p-5">
                        <div className="flex items-center gap-2.5 mb-3">
                          <span className="text-[22px]">{active.emoji}</span>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-gold-muted">
                              As a
                            </p>
                            <p className="text-[15px] font-bold text-text-primary font-playfair">
                              {active.label}
                            </p>
                          </div>
                        </div>
                        <p className="text-[14px] text-text-secondary leading-[1.7]">
                          {active.text}
                        </p>
                      </div>
                    );
                  })()}

                  {/* All perspectives grid (collapsed view) */}
                  <div className="border-t border-gold/15 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-text-muted mb-2.5">
                      All Perspectives
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {perspectives.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setPerspectiveActive(p.id)}
                          className={`flex items-start gap-3 p-2.5 rounded-[10px] text-left transition-all duration-150 cursor-pointer ${
                            perspectiveActive === p.id
                              ? "bg-maroon/5 border border-maroon/20"
                              : "hover:bg-smoke border border-transparent"
                          }`}
                        >
                          <span className="text-[16px] flex-shrink-0 mt-0.5">{p.emoji}</span>
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-text-primary block mb-0.5">
                              {p.label}
                            </span>
                            <span className="text-[12px] text-text-secondary leading-[1.5] line-clamp-2">
                              {p.text}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : perspectives.length === 0 ? (
                <div className="bg-white rounded-card border border-gold-subtle p-5 text-center">
                  <p className="text-[13px] font-semibold text-text-primary mb-1">
                    No relevant perspectives available
                  </p>
                  <p className="text-[12px] text-text-muted">
                    This article does not have a direct impact on specific groups.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-card border border-gold-subtle p-5 text-center">
                  <p className="text-[13px] text-text-muted">
                    Could not generate perspectives. Please try again.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* 🕒 Story Timeline / What Happened Next */}
          {(timelineLoading || storyTimeline) && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-maroon">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <h3 className="font-playfair text-[19px] font-bold text-text-primary">
                  Story Timeline
                </h3>
              </div>

              {timelineLoading ? (
                <div className="bg-white rounded-card border border-gold-subtle p-5 animate-pulse">
                  <div className="h-3 bg-smoke rounded w-1/2 mb-3" />
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 mb-3">
                      <div className="w-3 h-3 rounded-full bg-smoke flex-shrink-0 mt-1" />
                      <div className="flex-1 h-4 bg-smoke rounded" />
                    </div>
                  ))}
                </div>
              ) : storyTimeline ? (
                <div className="bg-white rounded-card border border-gold/40 shadow-card overflow-hidden">
                  {/* Story header */}
                  <div className="bg-gradient-to-r from-lemon to-white px-5 py-3.5 border-b border-gold/20 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-gold-muted mb-0.5">
                        🕒 Following This Story
                      </p>
                      <p className="text-[13px] font-semibold text-text-primary">
                        {storyTimeline.title}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold bg-maroon/10 text-maroon px-2 py-1 rounded-full">
                      {storyTimeline.articles?.filter(a => a.articleId?.title).length} events
                    </span>
                  </div>

                  {/* Timeline events */}
                  <div className="p-4">
                    {storyTimeline.articles
                      ?.filter(a => a.articleId?.title)
                      .sort((a, b) => new Date(a.articleId.publishedAt) - new Date(b.articleId.publishedAt))
                      .map((entry, i, arr) => {
                        const a = entry.articleId;
                        const isLast = i === arr.length - 1;
                        const isCurrent = a._id?.toString() === article?.id?.toString() || a.id === article?.id;
                        const eventColors = {
                          Origin:    "bg-maroon",
                          Breaking:  "bg-red-600",
                          Update:    "bg-gold",
                          Outcome:   "bg-green-500",
                          Reaction:  "bg-blue-400",
                          Announced: "bg-purple-500",
                        };
                        const dotColor = eventColors[entry.eventLabel] || "bg-text-muted";

                        return (
                          <div key={a._id || i} className="flex gap-3 group">
                            <div className="flex flex-col items-center flex-shrink-0">
                              <div className={`w-3 h-3 rounded-full ${dotColor} ${isCurrent ? "ring-2 ring-offset-1 ring-maroon" : ""} mt-1 z-10`} />
                              {!isLast && <div className="w-[1.5px] flex-1 bg-gold/20 mt-1 min-h-[24px]" />}
                            </div>
                            <div
                              className={`flex-1 pb-3 cursor-pointer ${isCurrent ? "" : "hover:opacity-80 transition-opacity duration-200"}`}
                              onClick={() => {
                                if (!isCurrent) openArticle({ ...a, id: a._id || a.id });
                              }}
                            >
                              {isCurrent && (
                                <span className="inline-block text-[9px] font-bold uppercase bg-maroon text-white px-1.5 py-0.5 rounded-[4px] mb-1">
                                  You are here
                                </span>
                              )}
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {entry.eventLabel && (
                                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.5px]">
                                    {entry.eventLabel}
                                  </span>
                                )}
                                <span className="text-[10px] text-text-muted">·</span>
                                <span className="text-[10px] text-text-muted">
                                  {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                                </span>
                              </div>
                              <p className={`text-[13px] leading-[1.4] font-medium ${isCurrent ? "text-maroon" : "text-text-primary group-hover:text-maroon"} transition-colors duration-200`}>
                                {a.title}
                              </p>
                              {!isLast && <div className="h-[6px]" />}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {/* Related articles */}
          {related.length > 0 && (
            <section>
              <h3 className="font-playfair text-[19px] font-bold text-text-primary mb-4">
                Related Stories
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {related.map((a) => (
                  <div key={a.id} className="card-reveal">
                    <NewsCard article={a} onClick={openArticle} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 panel-slide-up">
          {/* 1. AI Summary */}
          <div className="bg-smoke rounded-[14px] border border-gold/30 p-[18px]">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[1.5px] uppercase text-gold-muted">
                <ZapIcon size={14} className="text-maroon" /> AI Summary
              </div>
              {!summaryGenerated && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateSummary}
                  disabled={summaryLoading}
                >
                  {summaryLoading ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    "Generate"
                  )}
                </Button>
              )}
            </div>
            {summaryGenerated ? (
              <p className="text-[13.5px] text-text-secondary leading-[1.6]">
                {aiSummary || article.summary || "Summary not available."}
              </p>
            ) : (
              <p className="text-[13px] text-text-muted italic">
                Click "Generate" to create an AI summary.
              </p>
            )}
          </div>

          {/* 2. Hatke Version */}
          <div className="bg-wheat rounded-[14px] border border-gold/30 p-[18px]">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[1.5px] uppercase text-tan">
                <LaughIcon size={14} className="text-maroon" /> Hatke Version
              </div>
              {!hatkeText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateHatke}
                  disabled={hatkeLoading}
                >
                  {hatkeLoading ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    "Generate"
                  )}
                </Button>
              )}
            </div>
            {hatkeText ? (
              <p className="text-[13.5px] text-text-secondary leading-[1.7] font-playfair italic">
                {hatkeText}
              </p>
            ) : (
              <p className="text-[13px] text-text-muted italic">
                Generate a witty Hatke take on this story.
              </p>
            )}
          </div>

          {/* 3. Ask AI Chatbot */}
          <div className="bg-white rounded-[14px] border border-gold-subtle p-[18px]">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[1.5px] uppercase text-gold-muted mb-2.5">
              <BotIcon size={14} className="text-maroon" /> AI Chatbot
            </div>
            <p className="text-[13px] text-text-secondary leading-[1.5] mb-3">
              Ask the AI more about this story or related topics.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-center"
              onClick={() => {}}
            >
              Ask about this article
            </Button>
          </div>

          {/* 4. Add Note */}
          <div className="bg-white rounded-[14px] border border-gold-subtle p-[18px]">
            <div className="flex items-center gap-2 text-[13px] font-bold text-text-primary mb-3">
              <NoteIcon size={16} className="text-maroon" /> Add Note
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your thoughts about this article..."
              rows={3}
              className="w-full px-3 py-2.5 border-[1.5px] border-gold/25 rounded-[10px] font-inter text-[13px] text-text-secondary bg-smoke outline-none focus:border-gold resize-none leading-[1.6] placeholder:text-text-muted transition-all duration-200"
            />
            <div className="mt-2.5">
              <div className="relative mb-3">
                <CalendarIcon
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="date"
                  value={noteDue}
                  onChange={(e) => setNoteDue(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border-[1.5px] border-gold/25 rounded-[10px] font-inter text-[12.5px] text-text-primary bg-smoke outline-none focus:border-gold"
                />
              </div>
              <button
                onClick={handleSaveNote}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-[10px] text-[13px] font-semibold transition-all duration-200 cursor-pointer ${noteSaved ? "bg-green-500/10 text-green-700 border border-green-500/20" : "bg-maroon text-white hover:bg-maroon-dark"}`}
              >
                {noteSaved ? (
                  <>
                    <CheckIcon size={14} /> Note Saved!
                  </>
                ) : (
                  <>
                    <NoteIcon size={14} /> Save Note
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 5. About Source */}
          <div className="bg-white rounded-[14px] border border-gold-subtle p-5">
            <h4 className="text-[13px] font-semibold text-text-primary mb-3">
              About the Source
            </h4>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-[8px] bg-maroon/10 flex items-center justify-center text-maroon font-bold text-[13px] flex-shrink-0">
                {(article?.source || "N")[0]}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-text-primary">
                  {article?.source}
                </div>
                <div className="text-[11px] text-green-600 font-medium">
                  Verified Source
                </div>
              </div>
            </div>
            <p className="text-[12.5px] text-text-secondary leading-[1.65]">
              {DEFAULT_SOURCE_INFO}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
