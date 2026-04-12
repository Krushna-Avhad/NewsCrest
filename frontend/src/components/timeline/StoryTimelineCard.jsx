// src/components/timeline/StoryTimelineCard.jsx
import { useState } from "react";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const EVENT_COLORS = {
  Origin:    "bg-maroon text-white",
  Breaking:  "bg-red-600 text-white",
  Update:    "bg-gold/20 text-gold-muted border border-gold/40",
  Outcome:   "bg-green-100 text-green-800",
  Reaction:  "bg-blue-100 text-blue-700",
  Announced: "bg-purple-100 text-purple-700",
  default:   "bg-smoke text-text-secondary",
};

function EventBadge({ label }) {
  const cls = EVENT_COLORS[label] || EVENT_COLORS.default;
  return (
    <span className={`inline-block text-[9px] font-bold uppercase tracking-[1px] px-1.5 py-0.5 rounded-[5px] ${cls}`}>
      {label}
    </span>
  );
}

// ── Mini timeline dot-line ────────────────────────────────────────────────────
function TimelineDots({ articles, max = 4 }) {
  const visible = articles.slice(0, max);
  return (
    <div className="flex items-center gap-0">
      {visible.map((a, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              a.isOrigin ? "bg-maroon" : "bg-gold"
            }`}
          />
          {i < visible.length - 1 && (
            <div className="w-4 h-[2px] bg-gold/30" />
          )}
        </div>
      ))}
      {articles.length > max && (
        <span className="ml-1.5 text-[10px] text-text-muted font-semibold">
          +{articles.length - max}
        </span>
      )}
    </div>
  );
}

export default function StoryTimelineCard({ story, onOpen }) {

  if (!story || !story.articles?.length) return null;

  const latestArticle = story.articles[story.articles.length - 1]?.articleId;
  const originArticle = story.articles[0]?.articleId;
  const coverImage = latestArticle?.imageUrl || originArticle?.imageUrl;
  const newCount = story.newArticlesCount || 0;


  return (
    <div
      className="bg-white rounded-card border border-gold-subtle shadow-card overflow-hidden cursor-pointer hover:border-gold/50 hover:shadow-card-md transition-all duration-200 group"
      onClick={() => onOpen(story)}
    >
      {/* Top image strip */}
      <div className="relative h-[90px] overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={story.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-maroon to-maroon-dark" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Category pill */}
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-bold uppercase tracking-[1px] bg-white/90 text-maroon px-2 py-0.5 rounded-full">
            {story.category}
          </span>
        </div>

        {/* New updates badge */}
        {newCount > 0 && (
          <div className="absolute top-2 right-2">
            <span className="text-[9px] font-bold bg-maroon text-white px-2 py-0.5 rounded-full animate-pulse">
              {newCount} new
            </span>
          </div>
        )}

        {/* Timeline dots overlay */}
        <div className="absolute bottom-2 left-3">
          <TimelineDots articles={story.articles} max={5} />
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5">
        <h3 className="font-playfair text-[14px] font-bold text-text-primary leading-[1.35] mb-2 line-clamp-2 group-hover:text-maroon transition-colors duration-200">
          {story.title}
        </h3>

        {/* Latest update preview */}
        {latestArticle && (
          <div className="flex items-start gap-2 mb-2.5">
            <div className="w-1 h-full min-h-[28px] bg-gold/40 rounded-full flex-shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <EventBadge label={story.articles[story.articles.length - 1]?.eventLabel || "Update"} />
                <span className="text-[10px] text-text-muted">{timeAgo(latestArticle.publishedAt)}</span>
              </div>
              <p className="text-[12px] text-text-secondary leading-[1.4] line-clamp-2">
                {latestArticle.title}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gold/15">
          <div className="flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="text-[11px] text-text-muted">
              {story.articles.length} events · Updated {timeAgo(story.lastUpdatedAt)}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
