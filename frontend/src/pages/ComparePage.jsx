// src/pages/ComparePage.jsx
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { Button } from "../components/ui/Primitives";
import { compareAPI } from "../services/api";
import {
  ScaleIcon,
  CheckIcon,
  XIcon,
  ZapIcon,
  HeartIcon,
} from "../components/ui/Icons";

export default function ComparePage() {
  const { compareArticle, setCompareArticle, feedArticles, headlines } =
    useApp();

  const allArticles = [...(headlines || []), ...(feedArticles || [])].filter(
    (a, i, arr) => arr.findIndex((x) => x.id === a.id) === i,
  );

  const [topic1, setTopic1] = useState("");
  const [topic1Article, setTopic1Article] = useState(null);
  const [topic2, setTopic2] = useState("");
  const [topic2ArticleId, setTopic2ArticleId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useDropdown1, setUseDropdown1] = useState(false);

  // Pre-fill when coming from article page
  useEffect(() => {
    if (compareArticle) {
      setTopic1(compareArticle.title);
      setTopic1Article(compareArticle);
      setUseDropdown1(false);
      setCompareArticle(null);
    }
  }, [compareArticle]);

  const selectedTopic2Article = allArticles.find(
    (a) => a.id === topic2ArticleId,
  );
  const effectiveTopic2 = selectedTopic2Article
    ? selectedTopic2Article.title
    : topic2;

  const handleCompare = async () => {
    const t1 = topic1.trim();
    const t2 = effectiveTopic2.trim();
    if (!t1 || !t2) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      let raw;
      if (topic1Article?.id && selectedTopic2Article?.id) {
        raw = await compareAPI.compareByIds(
          topic1Article.id,
          selectedTopic2Article.id,
        );
      } else {
        raw = await compareAPI.compare(
          {
            title: t1,
            content: topic1Article?.content || topic1Article?.summary || t1,
          },
          {
            title: t2,
            content:
              selectedTopic2Article?.content ||
              selectedTopic2Article?.summary ||
              t2,
          },
        );
      }
      // raw is already comparison.results from api.js
      // Shape: { similarities:[{aspect,description}], differences:[{aspect,description}],
      //          insights:[{type,content,importance}], sentiment:{item1,item2,comparison}, overallScore }
      setResult(buildUIResult(raw, t1, t2));
    } catch (err) {
      setError(
        "Comparison failed. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Map raw AI results → clean UI shape
  function buildUIResult(raw, t1, t2) {
    const similarities = (raw.similarities || []).map((s) =>
      typeof s === "string"
        ? s
        : s.description || s.aspect || JSON.stringify(s),
    );
    const differences = (raw.differences || []).map((d) =>
      typeof d === "string"
        ? d
        : d.description || d.aspect || JSON.stringify(d),
    );
    const insights = (raw.insights || []).map((i) =>
      typeof i === "string"
        ? i
        : i.content || i.description || JSON.stringify(i),
    );

    // sentiment from backend: { item1: "positive", item2: "neutral", comparison: "item1_more_positive" }
    const sent = raw.sentiment || {};

    return {
      topic1: t1,
      topic2: t2,
      similarities,
      differences,
      insights,
      overallScore: raw.overallScore ?? null,
      sentiment: {
        topic1: sent.item1 || "Neutral",
        topic2: sent.item2 || "Neutral",
        analysis: sent.comparison
          ? sent.comparison.replace(/_/g, " ")
          : "Similar sentiment across both topics.",
      },
    };
  }

  return (
    <AppShell title="AI Comparison">
      {/* Header banner */}
      <div className="bg-gradient-to-br from-maroon to-maroon-dark rounded-[20px] p-7 mb-7 flex items-center justify-between slide-in-left">
        <div>
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-gold/70 mb-2">
            AI Feature
          </div>
          <h2 className="font-playfair text-[26px] font-bold text-white mb-1">
            Compare Any Two News Topics
          </h2>
          <p className="text-white/60 text-[13.5px]">
            Type a topic or select from your feed — get a full AI intelligence
            report.
          </p>
        </div>
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
          <ScaleIcon size={28} className="text-gold" />
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-5 items-start mb-7">
        {/* Topic A */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-semibold text-text-secondary tracking-[0.3px]">
              Topic / Headline A
            </label>
            <button
              onClick={() => setUseDropdown1((v) => !v)}
              className="text-[11px] text-maroon hover:underline cursor-pointer"
            >
              {useDropdown1 ? "Type instead" : "Select from feed"}
            </button>
          </div>
          {useDropdown1 ? (
            <select
              value={
                topic1Article
                  ? allArticles.findIndex((a) => a.id === topic1Article.id)
                  : ""
              }
              onChange={(e) => {
                const a = allArticles[parseInt(e.target.value)];
                setTopic1Article(a || null);
                setTopic1(a ? a.title : "");
              }}
              className="w-full px-4 py-3 border-[1.5px] border-gold/25 rounded-[12px] font-inter text-[14px] text-text-primary bg-white outline-none focus:border-gold cursor-pointer"
            >
              <option value="">— Select an article —</option>
              {allArticles.map((a, i) => (
                <option key={a.id} value={i}>
                  {a.title}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={topic1}
              onChange={(e) => {
                setTopic1(e.target.value);
                setTopic1Article(null);
              }}
              placeholder="e.g. GPT-5 AI Release"
              className="w-full px-4 py-3 border-[1.5px] border-gold/25 rounded-[12px] font-inter text-[14px] text-text-primary bg-white outline-none transition-all duration-200 placeholder:text-text-muted focus:border-gold focus:shadow-[0_0_0_3px_rgba(218,165,32,0.12)]"
            />
          )}
          {topic1Article && (
            <div className="mt-1.5 text-[11px] text-maroon bg-maroon/6 px-2.5 py-1 rounded-full inline-block">
              {topic1Article.source} · {topic1Article.category}
            </div>
          )}
        </div>

        <div className="w-11 h-11 rounded-full bg-maroon flex items-center justify-center text-white font-extrabold text-[12px] flex-shrink-0 mt-6">
          VS
        </div>

        {/* Topic B */}
        <div>
          <label className="block text-[12px] font-semibold text-text-secondary tracking-[0.3px] mb-1.5">
            Topic / Headline B
          </label>
          <select
            value={topic2ArticleId}
            onChange={(e) => {
              setTopic2ArticleId(e.target.value);
              setTopic2("");
            }}
            className="w-full px-4 py-3 border-[1.5px] border-gold/25 rounded-[12px] font-inter text-[14px] text-text-primary bg-white outline-none focus:border-gold cursor-pointer mb-2"
          >
            <option value="">— Select from feed —</option>
            {allArticles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-text-muted text-center mb-2">
            — or type a topic —
          </div>
          <input
            value={
              topic2ArticleId ? selectedTopic2Article?.title || "" : topic2
            }
            onChange={(e) => {
              setTopic2(e.target.value);
              setTopic2ArticleId("");
            }}
            placeholder="e.g. Gemini Ultra 2.0"
            disabled={!!topic2ArticleId}
            className="w-full px-4 py-3 border-[1.5px] border-gold/25 rounded-[12px] font-inter text-[14px] text-text-primary bg-white outline-none transition-all duration-200 placeholder:text-text-muted focus:border-gold focus:shadow-[0_0_0_3px_rgba(218,165,32,0.12)] disabled:bg-smoke disabled:text-text-muted"
          />
        </div>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-700 text-center">
          {error}
        </div>
      )}

      <div className="text-center mb-8">
        <Button
          variant="primary"
          size="lg"
          onClick={handleCompare}
          disabled={loading || !topic1.trim() || !effectiveTopic2.trim()}
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin mr-2">⟳</span>Analysing
              with AI...
            </>
          ) : (
            <>
              <ScaleIcon size={16} /> Compare Now
            </>
          )}
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-card border border-gold-subtle p-10 text-center animate-pulse">
          <div className="w-12 h-12 rounded-full bg-maroon/10 flex items-center justify-center mx-auto mb-4">
            <ScaleIcon size={24} className="text-maroon/40" />
          </div>
          <div className="h-4 bg-smoke rounded w-1/3 mx-auto mb-2" />
          <div className="h-3 bg-smoke rounded w-1/2 mx-auto" />
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="bg-white rounded-card border border-gold-subtle overflow-hidden shadow-card-md">
          {/* Header */}
          <div className="bg-smoke px-6 py-5 border-b border-gold/25 grid grid-cols-[1fr_auto_1fr] gap-4 items-center text-center">
            <h3 className="font-playfair text-[15px] font-bold text-text-primary line-clamp-2">
              {result.topic1}
            </h3>
            <div className="w-8 h-8 rounded-full bg-maroon flex items-center justify-center text-white font-extrabold text-[10px] flex-shrink-0">
              VS
            </div>
            <h3 className="font-playfair text-[15px] font-bold text-text-primary line-clamp-2">
              {result.topic2}
            </h3>
          </div>

          {/* Overall score */}
          {result.overallScore !== null && (
            <div className="px-6 py-3 border-b border-gold/15 flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[1px] text-text-muted">
                Similarity Score
              </span>
              <div className="flex-1 h-2 bg-smoke rounded-full overflow-hidden">
                <div
                  className="h-full bg-maroon rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.round((result.overallScore || 0) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[13px] font-bold text-maroon">
                {Math.round((result.overallScore || 0) * 100)}%
              </span>
            </div>
          )}

          {/* Similarities + Differences */}
          <div className="p-6 grid grid-cols-2 gap-6 border-b border-gold/15">
            {result.similarities.length > 0 && (
              <div>
                <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-text-muted mb-3 pb-2 border-b border-gold/20">
                  Similarities
                </div>
                <div className="space-y-2.5">
                  {result.similarities.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-[13.5px] text-text-secondary leading-[1.5]"
                    >
                      <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckIcon size={11} className="text-green-600" />
                      </div>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.differences.length > 0 && (
              <div>
                <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-text-muted mb-3 pb-2 border-b border-gold/20">
                  Key Differences
                </div>
                <div className="space-y-2.5">
                  {result.differences.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-[13.5px] text-text-secondary leading-[1.5]"
                    >
                      <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <XIcon size={10} className="text-red-500" />
                      </div>
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sentiment */}
          <div className="p-6 border-b border-gold/15">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[1px] uppercase text-pink-600 mb-3">
              <HeartIcon size={13} /> Sentiment Analysis
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center bg-smoke rounded-[10px] px-3 py-3 border border-gold/15">
                <div className="text-[9px] text-text-muted uppercase tracking-[0.5px] mb-1">
                  Topic A
                </div>
                <div className="text-[13px] font-semibold text-text-primary capitalize">
                  {result.sentiment.topic1}
                </div>
              </div>
              <div className="text-center bg-smoke rounded-[10px] px-3 py-3 border border-gold/15">
                <div className="text-[9px] text-text-muted uppercase tracking-[0.5px] mb-1">
                  Topic B
                </div>
                <div className="text-[13px] font-semibold text-text-primary capitalize">
                  {result.sentiment.topic2}
                </div>
              </div>
            </div>
            <p className="text-[13px] text-text-secondary leading-[1.5] capitalize">
              {result.sentiment.analysis}
            </p>
          </div>

          {/* Key Insights */}
          {result.insights.length > 0 && (
            <div className="mx-6 my-5 bg-lemon border border-gold/35 rounded-card p-5">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[1.5px] uppercase text-gold-muted mb-3">
                <ZapIcon size={13} className="text-maroon" /> Key Insights
              </div>
              <div className="space-y-2">
                {result.insights.map((insight, i) => (
                  <p
                    key={i}
                    className="font-playfair text-[14px] font-semibold text-text-primary leading-[1.6]"
                  >
                    {i + 1}. {insight}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
