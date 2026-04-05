// src/pages/DashboardPage.jsx
import { useApp } from "../context/AppContext";
import { useState, useEffect } from "react";
import AppShell from "../components/layout/AppShell";
import { NewsCard, HeadlineCard } from "../components/cards/NewsCard";
import {
  SectionHeader,
  Button,
  GoldDivider,
} from "../components/ui/Primitives";
import { TrendingIcon, ZapIcon, DiamondIcon } from "../components/ui/Icons";
import StoryTimelineCard from "../components/timeline/StoryTimelineCard";
import { timelineAPI } from "../services/api";

const LAYOUT_CLASS = {
  "Card Grid": "grid grid-cols-3 gap-5",
  "List Grid": "grid grid-cols-1 gap-4",
};

function LoadingCards({ count = 3 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div
      key={i}
      className="bg-white rounded-card border border-gold-subtle p-4 animate-pulse"
    >
      <div className="h-3 bg-smoke rounded w-1/3 mb-3" />
      <div className="h-4 bg-smoke rounded w-full mb-2" />
      <div className="h-4 bg-smoke rounded w-4/5" />
    </div>
  ));
}

export default function DashboardPage() {
  const {
    openArticle,
    setPage,
    readingPrefs,
    user,
    headlines,
    feedArticles,
    trendingArticles,
    localArticles,
    savedArticles,
    alerts,
    alertCount,
    newsLoading,
  } = useApp();

  const gridClass =
    LAYOUT_CLASS[readingPrefs?.feedLayout] || LAYOUT_CLASS["Card Grid"];

  const displayName = user?.name?.split(" ")[0] || "there";
  const location =
    user?.city && user?.state ? `${user.city}, ${user.state}` : "";
  const profileType = user?.profileType || "Reader";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  // Story Timeline
  const [myStories, setMyStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setStoriesLoading(true);
      timelineAPI
        .getMyStories()
        .then(s => setMyStories(s))
        .catch(() => {})
        .finally(() => setStoriesLoading(false));
    } else {
      // Show trending stories even without auth
      timelineAPI
        .getTrending()
        .then(s => setMyStories(s.slice(0, 3)))
        .catch(() => {});
    }
  }, [user]);

  // Stats from real data
  const savedCount = savedArticles.length;
  const alertsCount = alertCount;
  const notesCount = 0; // from context if needed

  return (
    <AppShell title="For You">
      {/* Welcome banner */}
      <div className="relative bg-gradient-to-br from-maroon to-maroon-dark rounded-[20px] p-7 mb-8 overflow-hidden slide-in-left">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 right-32 w-32 h-32 rounded-full bg-gold/10" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DiamondIcon size={8} className="text-gold pulse-dot" />
              <span className="text-[11px] font-bold tracking-[2px] uppercase text-gold/80">
                {greeting}
              </span>
            </div>
            <h2 className="font-playfair text-[26px] font-bold text-white mb-1">
              Welcome back, {displayName}
            </h2>
            <p className="text-white/60 text-[13.5px]">
              Your personalised {profileType} feed is ready
              {location ? ` · ${location}` : ""}
            </p>
          </div>
          <div className="flex gap-2.5">
            {[
              [String(savedCount), "Saved"],
              [String(alertsCount), "Alerts"],
            ].map(([v, l]) => (
              <div
                key={l}
                className="text-center bg-white/10 rounded-[12px] px-4 py-3 border border-white/10 stat-appear"
              >
                <div className="font-playfair text-[22px] font-bold text-white">
                  {v}
                </div>
                <div className="text-[10px] text-white/50 uppercase tracking-[0.5px]">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Headlines */}
      <section className="mb-8">
        <SectionHeader
          title="Top Headlines"
          subtitle="Breaking and most-read stories right now"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage("explore")}
            >
              View all
            </Button>
          }
        />
        <div className={gridClass}>
          {newsLoading ? (
            <LoadingCards count={3} />
          ) : (
            (headlines.length > 0 ? headlines : feedArticles)
              .slice(0, 3)
              .map((a) => (
                <div key={a.id} className="card-reveal">
                  <NewsCard article={a} onClick={openArticle} />
                </div>
              ))
          )}
        </div>
      </section>

      <GoldDivider />

      {/* 📌 Continue This Story */}
      {(storiesLoading || myStories.length > 0) && (
        <section className="mb-8">
          <SectionHeader
            title="Continue This Story"
            subtitle={user ? "Stories based on what you've read" : "Trending story threads right now"}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage("timeline")}
              >
                View all
              </Button>
            }
          />
          {storiesLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-card border border-gold-subtle overflow-hidden animate-pulse">
                  <div className="h-[90px] bg-smoke" />
                  <div className="p-3.5">
                    <div className="h-3 bg-smoke rounded w-3/4 mb-2" />
                    <div className="h-4 bg-smoke rounded w-full mb-1" />
                    <div className="h-4 bg-smoke rounded w-4/5 mb-3" />
                    <div className="flex gap-1">
                      {[1,2,3,4].map(j => <div key={j} className="w-2 h-2 rounded-full bg-smoke" />)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {myStories.slice(0, 3).map(story => (
                <div key={story._id} className="card-reveal">
                  <StoryTimelineCard
                    story={story}
                    onOpen={(s) => setPage("timeline")}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <GoldDivider />
      <div className="grid grid-cols-[1fr_300px] gap-6 mb-8">
        <section>
          <SectionHeader
            title="Recommended For You"
            subtitle={`Based on your ${profileType} profile`}
          />
          <div className="space-y-3">
            {newsLoading ? (
              <LoadingCards count={4} />
            ) : (
              feedArticles.slice(0, 5).map((a) => (
                <div key={a.id} className="slide-in-right">
                  <HeadlineCard article={a} onClick={openArticle} />
                </div>
              ))
            )}
          </div>
        </section>

        <div>
          {/* Trending Now */}
          <div className="bg-white rounded-card border border-gold-subtle shadow-card p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingIcon size={16} className="text-maroon" />
              <h3 className="font-playfair text-[17px] font-bold text-text-primary">
                Trending Now
              </h3>
            </div>
            <div className="space-y-2">
              {(trendingArticles.length > 0 ? trendingArticles : feedArticles)
                .slice(0, 8)
                .map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => openArticle(a)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-[10px] border border-gold-subtle bg-white cursor-pointer hover:border-gold/50 hover:bg-lemon transition-all duration-200 text-left group"
                  >
                    <span className="text-[11px] font-bold text-tan w-4 flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-text-primary group-hover:text-maroon transition-colors duration-200 line-clamp-1">
                      {a.title}
                    </span>
                  </button>
                ))}
            </div>
          </div>

          {/* AI Daily Brief */}
          <div className="bg-lemon rounded-card border border-gold/35 p-5 panel-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <ZapIcon size={14} className="text-gold-muted" />
              <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-gold-muted">
                AI Daily Brief
              </span>
            </div>
            <p className="font-playfair text-[14px] font-semibold text-text-primary leading-[1.5]">
              {feedArticles.length > 0
                ? `${feedArticles.length} stories curated for you today. Top topic: ${feedArticles[0]?.category || "News"}.`
                : "Your personalised digest is being prepared. Ask the AI chatbot for a summary."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full justify-center"
              onClick={() => setPage("chatbot")}
            >
              Ask AI Chatbot
            </Button>
          </div>
        </div>
      </div>

      {/* Local News */}
      {localArticles.length > 0 && (
        <section className="mb-8">
          <SectionHeader
            title="Local News"
            subtitle={location ? `From ${location}` : "Near You"}
            action={
              <Button variant="ghost" size="sm">
                More local
              </Button>
            }
          />
          <div
            className={
              readingPrefs?.feedLayout === "List Grid"
                ? "grid grid-cols-1 gap-4"
                : "grid grid-cols-2 gap-5"
            }
          >
            {localArticles.slice(0, 2).map((a) => (
              <div key={a.id} className="card-reveal">
                <NewsCard article={a} onClick={openArticle} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Latest Alerts */}
      {alerts.length > 0 && (
        <section className="mb-8">
          <SectionHeader
            title="Latest Alerts"
            subtitle="Important updates for you"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage("notifications")}
              >
                View all
              </Button>
            }
          />
          <div className="space-y-2">
            {alerts.slice(0, 4).map((a, i) => (
              <div
                key={a._id || a.id}
                className="slide-in-right w-full flex items-start gap-3.5 p-3.5 rounded-[12px] border border-gold-subtle bg-white cursor-pointer transition-all duration-200 hover:border-gold/50 hover:shadow-card text-left group"
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 mt-[6px] ${!a.isRead ? "bg-maroon pulse-dot" : "bg-text-muted"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-text-primary leading-[1.4] line-clamp-2 group-hover:text-maroon transition-colors duration-200">
                    {a.title}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {a.type} ·{" "}
                    {a.createdAt
                      ? new Date(a.createdAt).toLocaleDateString("en-IN")
                      : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Saved Articles */}
      {savedArticles.length > 0 && (
        <section>
          <SectionHeader
            title="Continue Reading"
            subtitle="Articles you saved"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage("saved")}
              >
                View saved
              </Button>
            }
          />
          <div className={gridClass}>
            {savedArticles.slice(0, 3).map((a) => (
              <div key={a.id} className="card-reveal">
                <NewsCard article={a} onClick={openArticle} />
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
