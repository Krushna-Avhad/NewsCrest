// src/pages/ExplorePage.jsx
import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { NewsCard } from "../components/cards/NewsCard";
import { Tabs, Pill, Button } from "../components/ui/Primitives";
import { searchAPI, newsAPI } from "../services/api";
import {
  SearchIcon,
  FilterIcon,
  TrendingIcon,
  ClockIcon,
} from "../components/ui/Icons";

const TABS = ["All", "World", "India", "Local", "Trending", "Latest"];

// Category mappings for tabs
const TAB_CATEGORIES = {
  World: "World",
  India: "India",
  Local: "Local",
  Trending: null, // uses trending endpoint
  Latest: null, // uses all news sorted by date
};

export default function ExplorePage() {
  const { openArticle, feedArticles, headlines, trendingArticles, allArticles, allArticlesLoading, newsPagination, loadMoreArticles } = useApp();
  const [activeTab, setActiveTab] = useState("All");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // ✅ Use allArticles (up to 50+) as base, fall back to headlines+feed
  const baseArticles = (allArticles?.length > 0
    ? allArticles
    : [...(headlines || []), ...(feedArticles || [])]
  ).filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);

  // Load trending topics on mount
  useEffect(() => {
    searchAPI
      .getTrending()
      .then((topics) => setTrendingTopics(topics.slice(0, 8)))
      .catch(() => {});
  }, []);

  const doSearch = useCallback(
    async (q, tab) => {
      const trimmed = q.trim();

      // "All" tab with no query — just show baseArticles, no API call needed
      if (tab === "All" && !trimmed) {
        setResults([]);
        setSearched(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setSearched(true);

      try {
        let articles = [];

        if (tab === "Trending") {
          // Use trendingArticles from context — already loaded
          articles = trendingArticles || [];

        } else if (tab === "Latest") {
          // Latest = all news sorted by date, no text filter
          const data = await newsAPI.getAll({ page: 1, limit: 50 });
          articles = data.articles || [];

        } else {
          // All other tabs (All + query, World, India, Local) → hit search endpoint
          const params = {};
          if (trimmed) params.q = trimmed;

          // Map tab name to the exact category string your DB uses
          const tabCategoryMap = {
            World: "World",
            India: "India",
            Local: "Local",
          };
          if (tabCategoryMap[tab]) params.category = tabCategoryMap[tab];

          const data = await searchAPI.search(params);
          articles = data.articles || []; // ✅ now reads correctly from {articles, pagination}
        }

        setResults(articles);
      } catch (_) {
        setResults([]);
      }

      setLoading(false);
    },
    [trendingArticles, baseArticles],
  );

  // React to tab changes
  useEffect(() => {
    doSearch(query, activeTab);
  }, [activeTab]); // query intentionally excluded — only fires on tab change

  const handleSearch = () => {
    if (!query.trim()) {
      // Empty search = clear results and go back to browsing
      setResults([]);
      setSearched(false);
      return;
    }
    doSearch(query, activeTab);
  };

  const handleTrendingClick = (topic) => {
    setQuery(
      typeof topic === "string" ? topic : topic.label || topic.keyword || "",
    );
    setActiveTab("All");
    doSearch(
      typeof topic === "string" ? topic : topic.label || topic.keyword || "",
      "All",
    );
  };

  // When searched/tab active → use API results
  // When on "All" with no query → use baseArticles directly
  const displayArticles = searched ? results : baseArticles;

  // Client-side filter only for live typing before user hits Search
  // Once searched=true we trust the API results completely
  const filteredByQuery = !searched && query.trim()
    ? displayArticles.filter(
        (a) =>
          a.title?.toLowerCase().includes(query.toLowerCase()) ||
          a.category?.toLowerCase().includes(query.toLowerCase()) ||
          a.source?.toLowerCase().includes(query.toLowerCase()),
      )
    : displayArticles;

  return (
    <AppShell title="Search & Explore">
      {/* Search bar */}
      <div className="relative mb-6 slide-in-left">
        <SearchIcon
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
            if (e.key === "Escape") setQuery("");
          }}
          placeholder="Search headlines, topics, sources..."
          className="w-full pl-11 pr-28 py-3.5 border-[1.5px] border-gold/30 rounded-[16px] text-[15px] font-inter bg-white outline-none text-text-primary placeholder:text-text-muted transition-all duration-200 shadow-card focus:border-gold focus:shadow-[0_0_0_3px_rgba(218,165,32,0.1)]"
        />
        <button
          onClick={
            query
              ? () => {
                  setQuery("");
                  setSearched(false);
                  setResults([]);
                }
              : handleSearch
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-maroon text-white rounded-[10px] px-3 py-1.5 text-[12px] font-semibold hover:bg-maroon-dark transition-colors duration-200"
        >
          {query ? "Clear" : "Search"}
        </button>
      </div>

      {/* Trending topics from API */}
      {trendingTopics.length > 0 && (
        <div className="mb-6 panel-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingIcon size={14} className="text-maroon" />
              <span className="text-[12px] font-semibold text-text-muted uppercase tracking-[1px]">
                Trending Topics
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((topic, i) => (
              <button
                key={i}
                onClick={() => handleTrendingClick(topic)}
                className="inline-flex items-center gap-1.5 px-[14px] py-[6px] rounded-full text-[12px] font-medium border border-gold-subtle bg-white text-text-secondary hover:border-gold hover:text-maroon hover:bg-lemon transition-all duration-200 cursor-pointer"
              >
                {typeof topic === "string"
                  ? topic
                  : topic.keyword || topic.label || topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
        <Button variant="secondary" size="sm">
          <FilterIcon size={14} /> Filter
        </Button>
      </div>

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
      ) : (
        <>
          <div className="mb-4 text-[13px] text-text-muted">
            Showing{" "}
            <span className="font-semibold text-text-primary">
              {filteredByQuery.length}
            </span>{" "}
            stories
            {query && (
              <>
                {" "}
                for <span className="font-semibold text-maroon">"{query}"</span>
              </>
            )}
          </div>

          {filteredByQuery.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-5">
                {filteredByQuery.map((a) => (
                  <div key={a.id} className="card-reveal">
                    <NewsCard article={a} onClick={openArticle} />
                  </div>
                ))}
              </div>
              {/* Load more — only show when not searching and more pages exist */}
              {!query.trim() && newsPagination?.hasNext && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={loadMoreArticles}
                    disabled={allArticlesLoading}
                    className="px-6 py-2.5 rounded-[12px] border border-gold/40 bg-white text-maroon text-[13px] font-semibold hover:bg-lemon hover:border-gold transition-all duration-200 disabled:opacity-50"
                  >
                    {allArticlesLoading ? "Loading..." : `Load More · ${newsPagination.total - filteredByQuery.length} remaining`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-card border border-gold-subtle fade-in">
              <div className="w-16 h-16 rounded-full bg-smoke flex items-center justify-center mx-auto mb-4">
                <SearchIcon size={28} className="text-text-muted opacity-40" />
              </div>
              <h3 className="font-playfair text-xl font-bold text-text-primary mb-2">
                No results found
              </h3>
              <p className="text-[13.5px] text-text-muted max-w-[280px] mx-auto">
                Try a different keyword or browse trending topics above.
              </p>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
