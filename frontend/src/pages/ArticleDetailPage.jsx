// src/pages/ArticleDetailPage.jsx
import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { NewsCard } from "../components/cards/NewsCard";
import { Button, NewsTag } from "../components/ui/Primitives";
import { newsAPI, hatkeAPI } from "../services/api";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
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

// ── Mic button ────────────────────────────────────────────────────────────────
function MicButton({ onPress, isSpeaking, disabled }) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      title={isSpeaking ? "Stop reading" : "Read article aloud"}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium border transition-all duration-200
        ${
          isSpeaking
            ? "bg-maroon text-white border-maroon shadow-[0_0_0_3px_rgba(116,21,21,0.18)] animate-pulse"
            : "text-text-secondary border-gold/25 hover:bg-smoke hover:border-gold/50"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {isSpeaking ? (
        <>
          <span className="w-3 h-3 flex items-center gap-[2px]">
            <span className="w-[3px] h-[10px] bg-white rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" />
            <span className="w-[3px] h-[6px] bg-white rounded-full animate-[bounce_0.6s_ease-in-out_0.1s_infinite]" />
            <span className="w-[3px] h-[10px] bg-white rounded-full animate-[bounce_0.6s_ease-in-out_0.2s_infinite]" />
          </span>
          Stop
        </>
      ) : (
        <>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Listen
        </>
      )}
    </button>
  );
}

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

  // Speech
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis();

  const handleListen = () => {
    if (isSpeaking) {
      stop();
      return;
    }
    // Speak: title + summary (or first paragraph of content)
    const title = article?.title || "";
    const summary =
      aiSummary || article?.summary || article?.content?.slice(0, 500) || "";
    const text = `${title}. ${summary}`;
    speak(text);
  };

  // Stop speech when navigating away
  useEffect(() => {
    return () => stop();
  }, [article?.id]);

  // Related articles
  const related = [...(headlines || []), ...(feedArticles || [])]
    .filter((a) => a.id !== article?.id && a.category === article?.category)
    .slice(0, 3);

  // AI summary
  const [summaryGenerated, setSummaryGenerated] = useState(!!article?.summary);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(article?.summary || "");

  // Hatke summary
  const [hatkeText, setHatkeText] = useState(article?.hatkeSummary || "");
  const [hatkeLoading, setHatkeLoading] = useState(false);

  useEffect(() => {
    if (article) {
      setSummaryGenerated(!!article.summary);
      setAiSummary(article.summary || "");
      setHatkeText(article.hatkeSummary || "");
      hatkeCalledRef.current = false;
      summaryCalledRef.current = false;
    }
  }, [article?.id]);

  const summaryCalledRef = useRef(false);

  const generateSummary = async () => {
    if (!article?.id || summaryCalledRef.current) return;
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
    if (!article?.id || hatkeCalledRef.current) return;
    hatkeCalledRef.current = true;
    setHatkeLoading(true);
    try {
      const data = await hatkeAPI.generateForArticle(article.id);
      setHatkeText(data?.hatkeSummary || data?.summary || "");
    } catch (_) {}
    setHatkeLoading(false);
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
        setShareMsg("Copied!");
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
        {/* ── Main content ── */}
        <div className="slide-in-left">
          {/* Category + tags */}
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

          {/* ── Action bar (with mic button) ── */}
          <div className="flex items-center gap-2 mb-8 pb-6 border-b border-gold/20 flex-wrap">
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

            {/* Mic / Listen button */}
            {isSupported && (
              <MicButton
                onPress={handleListen}
                isSpeaking={isSpeaking}
                disabled={false}
              />
            )}
          </div>

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

        {/* ── Sidebar ── */}
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
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-[10px] text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                  noteSaved
                    ? "bg-green-500/10 text-green-700 border border-green-500/20"
                    : "bg-maroon text-white hover:bg-maroon-dark"
                }`}
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
