import { useEffect, useState, useRef } from "react";
import AppShell from "../components/layout/AppShell";
import { EyeIcon } from "../components/ui/Icons";
import { Button } from "../components/ui/Primitives";
import { timelineAPI, factCheckAPI } from "../services/api";

export default function FactCheckPage() {
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef(null);

  // Load articles
  useEffect(() => {
    const load = async () => {
      try {
        const data = await timelineAPI.getAllArticles();
        setArticles(data || []);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter articles
  const filtered = articles.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  );

  // Verify logic
  const handleVerify = async () => {
    if (!selectedArticle) return;

    try {
      setLoading(true);
      setResult(null);

      const res = await factCheckAPI.verify({
        title: selectedArticle.title,
        description:
          selectedArticle.summary || selectedArticle.content,
        source: selectedArticle.source,
      });

      setResult(res);
    } catch (err) {
      console.error("Fact check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-[900px] mx-auto">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold flex items-center gap-2">
            <EyeIcon size={18} /> Fact Check
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Verify how reliable a news article is — powered by AI.
          </p>
        </div>

        {/* SELECT CARD */}
        <div className="bg-white border rounded-[16px] p-6 mb-6">
          <p className="text-[12px] tracking-wide text-gold mb-3">
            SELECT AN ARTICLE
          </p>

          {/* 🔍 SEARCHABLE DROPDOWN */}
          <div className="relative" ref={wrapperRef}>
            <input
              type="text"
              placeholder="Search or select article..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full border px-4 py-2 rounded-[12px]"
            />

            {isOpen && (
              <div className="absolute z-10 bg-white border w-full mt-1 max-h-[220px] overflow-y-auto rounded-[10px] shadow">
                {(query ? filtered : articles).map((a) => (
  <div
    key={a.articleId || a._id}
    onClick={() => {
      setSelectedArticle(a);
      setQuery(a.title);
      setIsOpen(false);
      setResult(null);
    }}
    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
  >
    {a.title}
  </div>
))}
              </div>
            )}
          </div>

          {/* SELECTED ARTICLE PREVIEW */}
          {selectedArticle && (
            <div className="mt-4 bg-gold/20 border border-gold/30 rounded-[12px] p-4">
              <div className="text-[10px] font-semibold tracking-wide text-maroon mb-1">
                TOP HEADLINES • {selectedArticle.source}
              </div>
              <div className="font-semibold text-[14px]">
                {selectedArticle.title}
              </div>
              <div className="text-sm text-text-muted mt-1">
                {selectedArticle.summary?.slice(0, 120)}...
              </div>
            </div>
          )}

          {/* 🔥 BUTTON */}
          <Button
            onClick={handleVerify}
            disabled={!selectedArticle || loading}
            className="mt-4 w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                Analysing article...
              </>
            ) : (
              "Verify This News"
            )}
          </Button>
        </div>

        {/* RESULT */}
        <div className="bg-white border rounded-[16px] p-6 min-h-[200px]">
          {!result ? (
            <div className="text-center text-text-muted">
              Choose an article above and click verify to see results.
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <div className="text-[10px] tracking-wide text-gold">
                  VERIFICATION RESULT
                </div>

                <h2 className="text-[20px] font-semibold mt-1">
                  {result.status === "Verified"
                    ? "🟢 Verified"
                    : result.status === "Mixed / Needs Context"
                    ? "🟡 Mixed"
                    : "🔴 Potentially Misleading"}
                </h2>
              </div>

              <div className="text-sm mb-3">
                <strong>Confidence:</strong> {result.confidence}%
              </div>

              <div className="text-sm mb-4">
                <strong>Reason:</strong> {result.reason}
              </div>

              <div>
                <div className="text-sm font-semibold mb-1">
  Cross Source Analysis
</div>

<p className="text-sm mb-2">
  {result.totalSources} related articles found across sources
</p>

<ul className="list-disc ml-5 text-sm">
  {result.sources?.map((s, i) => (
    <li key={i}>{s}</li>
  ))}
</ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}