// src/components/cards/NewsCard.jsx
import { useApp } from "../../context/AppContext";
import { BookmarkIcon, ShareIcon, ClockIcon } from "../ui/Icons";
import { NewsTag } from "../ui/Primitives";

const CAT_GRADIENTS = {
  Technology: "from-blue-900 to-blue-700",
  Finance: "from-green-900 to-green-700",
  Science: "from-indigo-900 to-indigo-700",
  Local: "from-[#741515] to-[#a02020]",
  Health: "from-red-800 to-red-600",
  Sports: "from-purple-900 to-purple-700",
  Politics: "from-gray-800 to-gray-600",
  Business: "from-amber-900 to-amber-700",
  Entertainment: "from-pink-900 to-pink-700",
  Education: "from-teal-900 to-teal-700",
  India: "from-orange-900 to-orange-700",
  World: "from-sky-900 to-sky-700",
  "Good News": "from-emerald-900 to-emerald-700",
  Fashion: "from-fuchsia-900 to-fuchsia-700",
  default: "from-[#741515] to-[#5a1010]",
};

const CAT_ICONS = {
  Technology: (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1.5"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  Finance: (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1.5"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Science: (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1.5"
    >
      <path d="M10 2v8L4.72 20.55A1 1 0 0 0 5.6 22h12.8a1 1 0 0 0 .88-1.45L14 10V2" />
      <line x1="8.5" y1="2" x2="15.5" y2="2" />
    </svg>
  ),
  Sports: (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M4.93 4.93l4.24 4.24" />
      <path d="M14.83 9.17l4.24-4.24" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  default: (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1.5"
    >
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </svg>
  ),
};

function CardImage({ article }) {
  const gradient = CAT_GRADIENTS[article.category] || CAT_GRADIENTS.default;
  const icon = CAT_ICONS[article.category] || CAT_ICONS.default;

  if (article.imageUrl) {
    return (
      <div className="w-full h-[180px] overflow-hidden bg-smoke relative">
        <img
          src={article.imageUrl}
          alt={article.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.parentElement.innerHTML = `<div class="w-full h-[180px] bg-gradient-to-br ${gradient} flex items-center justify-center"></div>`;
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`w-full h-[180px] bg-gradient-to-br ${gradient} flex items-center justify-center`}
    >
      {icon}
    </div>
  );
}

// NewsCard — no Compare button here; Compare lives only on the full ArticleDetailPage
export function NewsCard({ article, onClick, showSave = true }) {
  const { toggleSaveArticle, isArticleSaved } = useApp();
  const saved = isArticleSaved(article?.id);

  const handleShare = (e) => {
    e.stopPropagation();
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
      navigator.clipboard.writeText(article?.url || text).catch(() => {});
    }
  };

  return (
    <div
      className="bg-white rounded-card border border-gold-subtle shadow-card cursor-pointer transition-all duration-[250ms] hover:shadow-card-md hover:-translate-y-[3px] hover:border-gold/50 overflow-hidden"
      onClick={() => onClick?.(article)}
    >
      <CardImage article={article} />
      <div className="p-4">
        <NewsTag className="mb-2">{article.category}</NewsTag>
        <h3 className="font-playfair text-[17px] font-bold leading-[1.35] text-text-primary mb-2 line-clamp-2">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-[12.5px] text-text-muted leading-[1.5] mb-2 line-clamp-2">
            {article.summary}
          </p>
        )}
        <div className="flex items-center gap-2 text-[11.5px] text-text-muted">
          <span className="truncate max-w-[100px]">{article.source}</span>
          <span>·</span>
          <span className="whitespace-nowrap">{article.time}</span>
          {article.readTime && (
            <>
              <span>·</span>
              <ClockIcon size={12} />
              <span className="whitespace-nowrap">{article.readTime}</span>
            </>
          )}
        </div>
      </div>

      {showSave && (
        <div className="px-4 py-2.5 border-t border-gold-subtle flex items-center gap-2">
          <button
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-[8px] transition-colors duration-200 ${
              saved
                ? "text-maroon bg-maroon/6"
                : "text-text-secondary hover:bg-smoke"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              toggleSaveArticle(article);
            }}
          >
            <BookmarkIcon
              size={14}
              filled={saved}
              className={saved ? "text-maroon" : ""}
            />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-text-secondary rounded-[8px] hover:bg-smoke transition-colors duration-200"
            onClick={handleShare}
          >
            <ShareIcon size={13} />
            Share
          </button>
        </div>
      )}
    </div>
  );
}

export function HeadlineCard({ article, onClick }) {
  return (
    <div
      className="flex gap-3 p-3 rounded-[12px] border border-gold-subtle bg-white cursor-pointer hover:border-gold/50 hover:shadow-card transition-all duration-200"
      onClick={() => onClick?.(article)}
    >
      {article.imageUrl ? (
        <img
          src={article.imageUrl}
          alt={article.title}
          className="w-[72px] h-[60px] rounded-[8px] flex-shrink-0 object-cover"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      ) : (
        <div className="w-[72px] h-[60px] rounded-[8px] flex-shrink-0 bg-gradient-to-br from-[#741515] to-[#a02020] flex items-center justify-center">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
          >
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
            <path d="M18 14h-8" />
            <path d="M15 18h-5" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <NewsTag className="text-[9px] mb-1">{article.category}</NewsTag>
        <h4 className="font-playfair text-[14px] font-bold leading-[1.3] text-text-primary line-clamp-2">
          {article.title}
        </h4>
        <div className="text-[11px] text-text-muted mt-1">
          {article.source} · {article.time}
        </div>
      </div>
    </div>
  );
}

export function AlertItem({ alert, read = false }) {
  return (
    <div className="flex items-start gap-3.5 p-3.5 rounded-[12px] border border-gold-subtle bg-white mb-2.5 cursor-pointer transition-all duration-200 hover:border-gold/50 hover:shadow-card">
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 mt-[5px] ${read ? "bg-text-muted" : "bg-maroon"}`}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-text-primary leading-[1.4] line-clamp-2">
          {alert?.title || "Alert"}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">
          {alert?.type} ·{" "}
          {alert?.createdAt
            ? new Date(alert.createdAt).toLocaleDateString("en-IN")
            : ""}
        </div>
      </div>
    </div>
  );
}
