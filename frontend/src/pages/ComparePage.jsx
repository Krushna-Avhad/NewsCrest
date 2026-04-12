// src/pages/ComparePage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { Button } from "../components/ui/Primitives";
import { compareAPI } from "../services/api";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";

// ─────────────────────────────────────────────────────────────────────────────
// Style maps
// ─────────────────────────────────────────────────────────────────────────────
const SENTIMENT_STYLE = {
  positive: {
    pill: "text-green-700 bg-green-50 border-green-200",
    bar: "bg-green-500",
  },
  negative: {
    pill: "text-red-700 bg-red-50 border-red-200",
    bar: "bg-red-500",
  },
  neutral: {
    pill: "text-amber-700 bg-amber-50 border-amber-200",
    bar: "bg-amber-400",
  },
  mixed: {
    pill: "text-blue-700 bg-blue-50 border-blue-200",
    bar: "bg-blue-400",
  },
};
const IMPACT_PILL = {
  high: "text-red-700 bg-red-50 border-red-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  low: "text-green-700 bg-green-50 border-green-200",
};

// ─────────────────────────────────────────────────────────────────────────────
// Mic button
// ─────────────────────────────────────────────────────────────────────────────
function MicButton({ onPress, isSpeaking }) {
  return (
    <button
      onClick={onPress}
      title={isSpeaking ? "Stop reading" : "Listen to comparison"}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11.5px] font-medium border transition-all duration-200
        ${
          isSpeaking
            ? "bg-maroon text-white border-maroon shadow-[0_0_0_3px_rgba(116,21,21,0.15)] animate-pulse"
            : "text-text-secondary border-gold/25 bg-white hover:bg-smoke hover:border-gold/50"
        }`}
    >
      {isSpeaking ? (
        <>
          <span className="flex items-end gap-[2px] h-3">
            <span
              className="w-[3px] bg-white rounded-full animate-[bounce_0.5s_ease-in-out_infinite]"
              style={{ height: 10 }}
            />
            <span
              className="w-[3px] bg-white rounded-full animate-[bounce_0.5s_ease-in-out_0.1s_infinite]"
              style={{ height: 6 }}
            />
            <span
              className="w-[3px] bg-white rounded-full animate-[bounce_0.5s_ease-in-out_0.2s_infinite]"
              style={{ height: 10 }}
            />
          </span>
          Stop
        </>
      ) : (
        <>
          <svg
            width="12"
            height="12"
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

// ─────────────────────────────────────────────────────────────────────────────
// Build the TTS script from all result sections
// ─────────────────────────────────────────────────────────────────────────────
function buildSpeechScript(r) {
  const lines = [];

  lines.push(`Comparison: ${r.topic1} versus ${r.topic2}.`);

  if (r.similarities?.length) {
    lines.push(
      `Similarities. ${r.similarities.map((s, i) => `${i + 1}. ${s.description || s}`).join(" ")}`,
    );
  }

  if (r.differences?.length) {
    lines.push(
      `Key differences. ${r.differences.map((d, i) => `${i + 1}. ${d.description || d}`).join(" ")}`,
    );
  }

  if (r.sentiment) {
    lines.push(
      `Sentiment analysis. Article A is ${r.sentiment.topic1}. Article B is ${r.sentiment.topic2}. ${r.sentiment.analysis}`,
    );
  }

  if (r.socialImpact) {
    const si = r.socialImpact;
    if (si.topic1?.summary)
      lines.push(`Social impact on Article A: ${si.topic1.summary}`);
    if (si.topic2?.summary)
      lines.push(`Social impact on Article B: ${si.topic2.summary}`);
    if (si.overall) lines.push(`Overall social impact: ${si.overall}`);
  }

  if (r.insights?.length) {
    lines.push(
      `Final insights. ${r.insights.map((ins, i) => `${i + 1}. ${typeof ins === "string" ? ins : ins.content || ""}`).join(" ")}`,
    );
  }

  return lines.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny atoms
// ─────────────────────────────────────────────────────────────────────────────
function SectionHead({ label, sub, color = "text-text-muted" }) {
  return (
    <div
      className={`flex items-center justify-between pb-2 mb-3 border-b border-gold/15 ${color}`}
    >
      <span className="text-[10.5px] font-bold tracking-[1.8px] uppercase">
        {label}
      </span>
      {sub && (
        <span className="text-[10px] font-semibold opacity-60">{sub}</span>
      )}
    </div>
  );
}

function BulletRow({ text, dotCls }) {
  return (
    <div className="flex items-start gap-2.5 text-[13px] text-text-secondary leading-[1.55]">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 mt-[5px] ${dotCls}`}
      />
      <span>{text}</span>
    </div>
  );
}

function SentimentPill({ tone }) {
  const s =
    SENTIMENT_STYLE[(tone || "neutral").toLowerCase()] ||
    SENTIMENT_STYLE.neutral;
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold border capitalize ${s.pill}`}
    >
      {tone || "Neutral"}
    </span>
  );
}

function MiniBar({ pct, cls }) {
  return (
    <div className="w-full h-1.5 bg-smoke rounded-full overflow-hidden mt-1.5">
      <div
        className={`h-full rounded-full transition-all duration-700 ${cls}`}
        style={{ width: `${Math.min(100, Math.max(0, Math.round(pct)))}%` }}
      />
    </div>
  );
}

function ImpactPill({ level }) {
  const k = (level || "medium").toLowerCase();
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border capitalize ${IMPACT_PILL[k] || IMPACT_PILL.medium}`}
    >
      {level || "medium"}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Searchable article dropdown
// ─────────────────────────────────────────────────────────────────────────────
function ArticleSelector({
  label,
  slot,
  article,
  onSelect,
  onType,
  typed,
  articles,
}) {
  const [mode, setMode] = useState("dropdown");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    if (article) setMode("dropdown");
  }, [article]);

  const filtered = search.trim()
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          (a.category || "").toLowerCase().includes(search.toLowerCase()) ||
          (a.source || "").toLowerCase().includes(search.toLowerCase()),
      )
    : articles;

  const toggle = () => {
    const next = mode === "dropdown" ? "type" : "dropdown";
    setMode(next);
    if (next === "dropdown") onType?.("");
    else {
      onSelect?.(null);
      setSearch("");
    }
  };

  return (
    <div className="flex flex-col gap-1.5" style={{ minHeight: 96 }}>
      <div className="flex items-center justify-between h-5">
        <label className="text-[11.5px] font-semibold text-text-secondary tracking-[0.3px]">
          {label}
        </label>
        <button
          onClick={toggle}
          className="text-[10.5px] text-maroon hover:underline font-medium whitespace-nowrap"
        >
          {mode === "dropdown" ? "Type instead" : "Select from feed"}
        </button>
      </div>

      {mode === "type" ? (
        <input
          value={typed}
          onChange={(e) => onType?.(e.target.value)}
          placeholder={
            slot === "A" ? "e.g. India GDP Growth" : "e.g. US Federal Reserve"
          }
          className="w-full px-3.5 py-2.5 border-[1.5px] border-gold/25 rounded-[10px] text-[13.5px] text-text-primary bg-white outline-none transition-all placeholder:text-text-muted focus:border-gold"
        />
      ) : (
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full px-3.5 py-2.5 border-[1.5px] border-gold/25 rounded-[10px] text-[13.5px] bg-white cursor-pointer flex items-center justify-between gap-2 hover:border-gold/50 transition-colors text-left"
          >
            <span
              className={`truncate flex-1 ${article ? "text-text-primary" : "text-text-muted"}`}
            >
              {article ? article.title : "— Select an article —"}
            </span>
            <span className="text-[9px] text-text-muted font-bold flex-shrink-0">
              ▾
            </span>
          </button>
          {open && (
            <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-white border border-gold/30 rounded-[12px] shadow-lg overflow-hidden">
              <div className="px-3 pt-2.5 pb-2 border-b border-gold/15">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full px-3 py-1.5 text-[12px] border border-gold/20 rounded-[7px] outline-none focus:border-gold bg-smoke"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-4 py-3 text-[12.5px] text-text-muted text-center">
                    No articles found
                  </div>
                ) : (
                  filtered.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        onSelect?.(a);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-4 py-2.5 text-[12.5px] border-b border-gold/10 last:border-0 hover:bg-smoke transition-colors ${article?.id === a.id ? "bg-maroon/5 text-maroon font-semibold" : "text-text-primary"}`}
                    >
                      <div className="font-medium line-clamp-1 leading-[1.3]">
                        {a.title}
                      </div>
                      <div className="text-[10.5px] text-text-muted mt-0.5">
                        {a.source} · {a.category}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="h-6 flex items-center gap-2">
        {article && mode === "dropdown" && (
          <>
            <span className="text-[10px] text-maroon bg-maroon/6 border border-maroon/20 px-2 py-0.5 rounded-full">
              <span className="font-semibold">{article.source}</span> ·{" "}
              {article.category}
            </span>
            <button
              onClick={() => {
                onSelect?.(null);
                setSearch("");
              }}
              className="text-[10.5px] text-text-muted hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Result card — all 5 sections + mic button
// ─────────────────────────────────────────────────────────────────────────────
function ResultCard({ result, onReset }) {
  const r = result;
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis();

  const handleListen = () => {
    if (isSpeaking) {
      stop();
      return;
    }
    speak(buildSpeechScript(r));
  };

  // Stop when result changes
  useEffect(() => {
    return () => stop();
  }, [result]);

  return (
    <div className="rounded-[16px] border border-gold-subtle overflow-hidden shadow-card-md bg-white">
      {/* Header */}
      <div className="bg-smoke px-6 py-5 border-b border-gold/25">
        <div className="grid grid-cols-[1fr_44px_1fr] gap-3 items-center text-center mb-3">
          <div>
            <div className="text-[9px] uppercase tracking-[1px] text-text-muted font-bold mb-1">
              Article A
            </div>
            <p className="font-playfair text-[14px] font-bold text-text-primary line-clamp-2 leading-[1.35]">
              {r.topic1}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-maroon flex items-center justify-center text-white font-extrabold text-[10px] mx-auto flex-shrink-0">
            VS
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[1px] text-text-muted font-bold mb-1">
              Article B
            </div>
            <p className="font-playfair text-[14px] font-bold text-text-primary line-clamp-2 leading-[1.35]">
              {r.topic2}
            </p>
          </div>
        </div>
        {/* Mic button in header */}
        {isSupported && (
          <div className="flex justify-center">
            <MicButton onPress={handleListen} isSpeaking={isSpeaking} />
          </div>
        )}
      </div>

      {/* Similarity score */}
      {r.overallScore !== null && (
        <div className="px-6 py-3 border-b border-gold/15 flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-[1px] text-text-muted whitespace-nowrap">
            Match Score
          </span>
          <div className="flex-1 h-2 bg-smoke rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-maroon to-maroon-dark rounded-full transition-all duration-700"
              style={{ width: `${Math.round((r.overallScore || 0) * 100)}%` }}
            />
          </div>
          <span className="text-[14px] font-bold text-maroon min-w-[36px] text-right">
            {Math.round((r.overallScore || 0) * 100)}%
          </span>
        </div>
      )}

      {/* 1. Similarities + Key Differences */}
      <div className="p-6 grid grid-cols-2 gap-6 border-b border-gold/15">
        <div>
          <SectionHead
            label="Similarities"
            sub={r.similarities.length}
            color="text-green-700"
          />
          {r.similarities.length > 0 ? (
            <div className="space-y-2.5">
              {r.similarities.map((s, i) => (
                <BulletRow
                  key={i}
                  text={s.description || s}
                  dotCls="bg-green-500"
                />
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-text-muted italic">
              None identified.
            </p>
          )}
        </div>
        <div>
          <SectionHead
            label="Key Differences"
            sub={r.differences.length}
            color="text-red-600"
          />
          {r.differences.length > 0 ? (
            <div className="space-y-2.5">
              {r.differences.map((d, i) => (
                <BulletRow
                  key={i}
                  text={d.description || d}
                  dotCls="bg-red-500"
                />
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-text-muted italic">
              None identified.
            </p>
          )}
        </div>
      </div>

      {/* 2. Sentiment Analysis */}
      <div className="p-6 border-b border-gold/15">
        <SectionHead label="Sentiment Analysis" color="text-maroon" />
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { lbl: "Article A", tone: r.sentiment.topic1 },
            { lbl: "Article B", tone: r.sentiment.topic2 },
          ].map(({ lbl, tone }) => {
            const key = (tone || "neutral").toLowerCase();
            const s = SENTIMENT_STYLE[key] || SENTIMENT_STYLE.neutral;
            const pct =
              key === "positive"
                ? 78
                : key === "negative"
                  ? 22
                  : key === "mixed"
                    ? 60
                    : 50;
            return (
              <div
                key={lbl}
                className="bg-smoke rounded-[10px] p-3.5 border border-gold/15"
              >
                <div className="text-[9px] uppercase tracking-[1px] text-text-muted font-bold mb-2">
                  {lbl}
                </div>
                <SentimentPill tone={tone} />
                <MiniBar pct={pct} cls={s.bar} />
              </div>
            );
          })}
        </div>
        <div className="bg-amber-50/50 border border-amber-100 rounded-[9px] px-4 py-2.5 text-[12.5px] text-text-secondary leading-[1.6]">
          {r.sentiment.analysis}
        </div>
      </div>

      {/* 3. Social Impact */}
      {r.socialImpact && (
        <div className="p-6 border-b border-gold/15">
          <SectionHead label="Social Impact" color="text-orange-700" />
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { lbl: "Article A", ia: r.socialImpact.topic1 },
              { lbl: "Article B", ia: r.socialImpact.topic2 },
            ].map(({ lbl, ia }) => {
              if (!ia) return null;
              return (
                <div
                  key={lbl}
                  className="bg-smoke rounded-[10px] p-3.5 border border-gold/15 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] uppercase tracking-[1px] text-text-muted font-bold">
                      {lbl}
                    </div>
                    <ImpactPill level={ia.level} />
                  </div>
                  {(ia.areas || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ia.areas.map((a, i) => (
                        <span
                          key={i}
                          className="text-[10.5px] px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                  {ia.summary && (
                    <p className="text-[11.5px] text-text-muted italic leading-[1.5]">
                      {ia.summary}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {r.socialImpact.overall && (
            <div className="bg-orange-50/50 border border-orange-100 rounded-[9px] px-4 py-2.5 text-[12.5px] text-text-secondary leading-[1.6]">
              {r.socialImpact.overall}
            </div>
          )}
        </div>
      )}

      {/* 4. Final Insights */}
      {r.insights.length > 0 && (
        <div className="mx-6 my-5 bg-lemon border border-gold/35 rounded-[14px] p-5">
          <SectionHead
            label="Final Insights"
            sub={r.insights.length}
            color="text-maroon"
          />
          <div className="space-y-3">
            {r.insights.map((ins, i) => {
              const text = typeof ins === "string" ? ins : ins.content || "";
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-maroon/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-maroon">
                      {i + 1}
                    </span>
                  </div>
                  <p className="font-playfair text-[13.5px] font-semibold text-text-primary leading-[1.6]">
                    {text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 bg-smoke border-t border-gold/15 text-center">
        <button
          onClick={onReset}
          className="px-5 py-2 text-[12.5px] font-semibold text-maroon border border-maroon/25 bg-white rounded-[10px] hover:bg-maroon/5 transition-colors"
        >
          Compare Different Articles
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// History section
// ─────────────────────────────────────────────────────────────────────────────
function HistorySection({ onRestore }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await compareAPI.getHistory();
      setItems(data || []);
    } catch (_) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="mt-8">
        <div className="h-4 bg-smoke rounded w-40 mb-3 animate-pulse" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-14 bg-smoke rounded-[12px] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-text-muted">
          Previous Comparisons ({items.length})
        </h3>
        <button
          onClick={load}
          className="text-[11px] text-maroon hover:underline font-medium"
        >
          Refresh
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const title1 = item.item1?.title || "Article A";
          const title2 = item.item2?.title || "Article B";
          const score = item.results?.overallScore;
          const date = item.createdAt
            ? new Date(item.createdAt).toLocaleString("en-IN", {
                dateStyle: "short",
                timeStyle: "short",
              })
            : "";
          return (
            <div
              key={item._id || idx}
              className="bg-white border border-gold-subtle rounded-[12px] overflow-hidden"
            >
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-smoke/50 transition-colors"
                onClick={() => setExpanded(expanded === idx ? null : idx)}
              >
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <p className="text-[12px] font-semibold text-text-primary truncate">
                      {title1}
                    </p>
                    <span className="text-[8px] font-extrabold text-white bg-maroon px-1.5 py-0.5 rounded-full flex-shrink-0">
                      VS
                    </span>
                    <p className="text-[12px] font-semibold text-text-primary truncate text-right">
                      {title2}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-text-muted">{date}</span>
                    {score != null && (
                      <span className="text-[10px] font-semibold text-maroon">
                        {Math.round(score * 100)}% similar
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(item);
                    }}
                    className="text-[11px] text-maroon font-semibold px-2.5 py-1 rounded-[7px] hover:bg-maroon/8 transition-colors border border-maroon/20"
                  >
                    View
                  </button>
                  <span className="text-[9px] text-text-muted">
                    {expanded === idx ? "▲" : "▼"}
                  </span>
                </div>
              </button>
              {expanded === idx && (
                <div className="border-t border-gold/15 px-4 py-3 bg-smoke/40">
                  <div className="grid grid-cols-2 gap-4">
                    {item.results?.similarities?.[0] && (
                      <div>
                        <div className="text-[9px] uppercase tracking-[1px] text-green-700 font-bold mb-1">
                          Top Similarity
                        </div>
                        <p className="text-[11.5px] text-text-secondary leading-[1.5]">
                          {item.results.similarities[0].description ||
                            item.results.similarities[0]}
                        </p>
                      </div>
                    )}
                    {item.results?.differences?.[0] && (
                      <div>
                        <div className="text-[9px] uppercase tracking-[1px] text-red-600 font-bold mb-1">
                          Top Difference
                        </div>
                        <p className="text-[11.5px] text-text-secondary leading-[1.5]">
                          {item.results.differences[0].description ||
                            item.results.differences[0]}
                        </p>
                      </div>
                    )}
                    {item.results?.sentiment && (
                      <div className="col-span-2 pt-2 border-t border-gold/10">
                        <div className="text-[9px] uppercase tracking-[1px] text-maroon font-bold mb-1">
                          Sentiment
                        </div>
                        <p className="text-[11.5px] text-text-secondary leading-[1.5]">
                          {item.results.sentiment.comparison}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const { compareArticle, setCompareArticle, feedArticles, headlines } =
    useApp();

  const allArticles = [...(headlines || []), ...(feedArticles || [])].filter(
    (a, i, arr) => arr.findIndex((x) => x.id === a.id) === i,
  );

  const [articleA, setArticleA] = useState(null);
  const [topicA, setTopicA] = useState("");
  const [articleB, setArticleB] = useState(null);
  const [topicB, setTopicB] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (compareArticle) {
      setArticleA(compareArticle);
      setTopicA(compareArticle.title);
      setCompareArticle(null);
      setResult(null);
      setError("");
    }
  }, [compareArticle, setCompareArticle]);

  const effectiveA = articleA ? articleA.title : topicA;
  const effectiveB = articleB ? articleB.title : topicB;
  const canCompare =
    effectiveA.trim().length > 0 && effectiveB.trim().length > 0;

  const handleCompare = async () => {
    if (!canCompare) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      let raw;
      if (articleA?.id && articleB?.id) {
        raw = await compareAPI.compareByIds(articleA.id, articleB.id);
      } else {
        raw = await compareAPI.compare(
          {
            title: effectiveA.trim(),
            content:
              articleA?.content || articleA?.summary || effectiveA.trim(),
          },
          {
            title: effectiveB.trim(),
            content:
              articleB?.content || articleB?.summary || effectiveB.trim(),
          },
        );
      }
      setResult(buildUIResult(raw, effectiveA.trim(), effectiveB.trim()));
    } catch {
      setError(
        "Comparison failed. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setArticleA(null);
    setTopicA("");
    setArticleB(null);
    setTopicB("");
    setResult(null);
    setError("");
  };

  function buildUIResult(raw, t1, t2) {
    const similarities = raw.similarities || [];
    const differences = raw.differences || [];
    const insights = raw.insights || [];
    const sent = raw.sentiment || {};
    const si = raw.socialImpact || null;

    return {
      topic1: t1,
      topic2: t2,
      similarities,
      differences,
      insights,
      overallScore:
        typeof raw.overallScore === "number" ? raw.overallScore : null,
      sentiment: {
        topic1: sent.item1 || sent.topic1 || "Neutral",
        topic2: sent.item2 || sent.topic2 || "Neutral",
        analysis:
          sent.comparison ||
          sent.analysis ||
          "Similar tone across both articles.",
      },
      socialImpact: si
        ? {
            topic1: si.item1 || si.topic1 || null,
            topic2: si.item2 || si.topic2 || null,
            overall: si.overall || null,
          }
        : null,
    };
  }

  const handleRestore = (item) => {
    const t1 = item.item1?.title || "";
    const t2 = item.item2?.title || "";
    setResult(buildUIResult(item.results || {}, t1, t2));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AppShell title="AI Comparison">
      {/* Hero */}
      <div className="bg-gradient-to-br from-maroon to-maroon-dark rounded-[18px] p-6 mb-6">
        <div className="text-[10px] font-bold tracking-[2px] uppercase text-gold/70 mb-1.5">
          AI Feature
        </div>
        <h2 className="font-playfair text-[23px] font-bold text-white mb-1">
          Compare Any Two News Topics
        </h2>
        <p className="text-white/60 text-[13px]">
          Select articles from your feed or type any topic — get AI analysis
          with voice readout support.
        </p>
      </div>

      {/* Input card */}
      <div className="bg-white rounded-[16px] border border-gold-subtle shadow-card p-5 mb-6">
        <div className="grid grid-cols-[1fr_44px_1fr] gap-4 items-start">
          <ArticleSelector
            label="Article / Topic A"
            slot="A"
            article={articleA}
            onSelect={(a) => {
              setArticleA(a);
              setTopicA(a?.title || "");
            }}
            onType={(v) => {
              setTopicA(v);
              setArticleA(null);
            }}
            typed={topicA}
            articles={allArticles}
          />
          <div className="flex justify-center pt-[22px]">
            <div className="w-10 h-10 rounded-full bg-maroon flex items-center justify-center text-white font-extrabold text-[10px] flex-shrink-0">
              VS
            </div>
          </div>
          <ArticleSelector
            label="Article / Topic B"
            slot="B"
            article={articleB}
            onSelect={(a) => {
              setArticleB(a);
              setTopicB(a?.title || "");
            }}
            onType={(v) => {
              setTopicB(v);
              setArticleB(null);
            }}
            typed={topicB}
            articles={allArticles}
          />
        </div>

        {error && (
          <div className="mt-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-[9px] text-[12.5px] text-red-700 text-center">
            {error}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 mt-5">
          <Button
            variant="primary"
            size="lg"
            onClick={handleCompare}
            disabled={loading || !canCompare}
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin mr-1.5">⟳</span>
                Analysing…
              </>
            ) : (
              "Compare Now"
            )}
          </Button>
          {(articleA || articleB || topicA || topicB || result) && (
            <button
              onClick={handleReset}
              className="px-4 py-2.5 text-[12.5px] font-medium text-text-secondary border border-gold/25 rounded-[10px] hover:bg-smoke transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-[16px] border border-gold-subtle p-10 text-center mb-6">
          <div className="space-y-2.5 animate-pulse max-w-xs mx-auto">
            <div className="h-3 bg-smoke rounded w-full" />
            <div className="h-3 bg-smoke rounded w-5/6" />
            <div className="h-3 bg-smoke rounded w-4/6" />
            <div className="h-3 bg-smoke rounded w-5/6" />
          </div>
          <p className="text-[12.5px] text-text-muted mt-5">
            AI is analysing both articles…
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <ResultCard result={result} onReset={handleReset} />
      )}

      {/* History */}
      <HistorySection onRestore={handleRestore} />
    </AppShell>
  );
}
