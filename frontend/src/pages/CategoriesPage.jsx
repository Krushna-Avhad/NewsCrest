// src/pages/CategoriesPage.jsx
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { newsAPI } from "../services/api";
import {
  NewspaperIcon,
  BotIcon,
  TrendingIcon,
  GridIcon,
  GlobeIcon,
  HeartIcon,
  SparkleIcon,
  NoteIcon,
  BookmarkIcon,
  MapPinIcon,
  StarIcon,
  UserIcon,
} from "../components/ui/Icons";

// ── Category definitions with Unsplash images ────────────────────────────────
const CATEGORIES = [
  {
    name: "Top Headlines",
    color: "#741515",
    light: "#fef2f2",
    image:
      "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "Technology",
    color: "#1e3a5f",
    light: "#eff6ff",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "Finance",
    color: "#1a6b3a",
    light: "#f0fdf4",
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "Sports",
    color: "#7c3aed",
    light: "#f5f3ff",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "Health",
    color: "#b91c1c",
    light: "#fff1f2",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "Science",
    color: "#0369a1",
    light: "#f0f9ff",
    image:
      "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "Business",
    color: "#92400e",
    light: "#fffbeb",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "Entertainment",
    color: "#9d174d",
    light: "#fdf2f8",
    image:
      "https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "Politics",
    color: "#374151",
    light: "#f9fafb",
    image:
      "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "Education",
    color: "#065f46",
    light: "#ecfdf5",
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "India",
    color: "#854d0e",
    light: "#fefce8",
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "World",
    color: "#1e40af",
    light: "#eff6ff",
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "Local",
    color: "#166534",
    light: "#f0fdf4",
    image:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "Good News",
    color: "#0f766e",
    light: "#f0fdfa",
    image:
      "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&q=70&auto=format&fit=crop",
  },
  {
    name: "Fashion",
    color: "#86198f",
    light: "#fdf4ff",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70&auto=format&fit=crop",
  },
];

const CAT_ICONS = {
  "Top Headlines": NewspaperIcon,
  Technology: BotIcon,
  Finance: TrendingIcon,
  Sports: StarIcon,
  Health: HeartIcon,
  Science: SparkleIcon,
  Business: GridIcon,
  Entertainment: SparkleIcon,
  Politics: NoteIcon,
  Education: BookmarkIcon,
  India: MapPinIcon,
  World: GlobeIcon,
  Local: MapPinIcon,
  "Good News": StarIcon,
  Fashion: UserIcon,
};

// ── Single category card ──────────────────────────────────────────────────────
function CategoryCard({ name, color, light, image, count, delay, onClick }) {
  const Icon = CAT_ICONS[name] || NewspaperIcon;
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
      className="card-reveal group relative bg-white rounded-card border border-gold-subtle shadow-card overflow-hidden text-left cursor-pointer hover:shadow-card-md hover:-translate-y-[3px] transition-all duration-200"
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] z-10"
        style={{ background: color }}
      />

      {/* Image section */}
      <div className="relative h-[110px] overflow-hidden">
        {!imgError ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          // Fallback gradient if image fails
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${color}22, ${color}44)`,
            }}
          >
            <Icon size={32} style={{ color, opacity: 0.5 }} />
          </div>
        )}

        {/* Dark overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {/* Icon badge over image */}
        <div
          className="absolute bottom-2.5 left-3 w-8 h-8 rounded-[8px] flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-110"
          style={{ background: color }}
        >
          <Icon size={15} className="text-white" />
        </div>

        {/* REMOVED: Article count badge */}
        {/* {count !== null && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-black/40 text-white backdrop-blur-sm">
            {count}
          </div>
        )} */}
      </div>

      {/* Text section */}
      <div className="px-3.5 pt-3 pb-3.5">
        <div
          className="font-playfair text-[14.5px] font-bold mb-0.5 transition-colors duration-200 group-hover:text-maroon"
          style={{ color: "var(--color-text-primary, #1a1a1a)" }}
        >
          {name}
        </div>

        {/* Changed: "525 articles" → "Browse stories" */}
        <div className="text-[11px] text-text-muted flex items-center justify-between">
          <span className="font-medium text-maroon">Browse stories</span>
          <span
            className="opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-4px] group-hover:translate-x-0 font-bold text-[10px]"
            style={{ color }}
          >
            →
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const { setPage, setActiveCat } = useApp();
  const [countMap, setCountMap] = useState({});

  // We still fetch counts (in case you want to use them later), but we no longer display them
  useEffect(() => {
    newsAPI
      .getCategoryCounts()
      .then((counts) => setCountMap(counts))
      .catch(() => {});
  }, []);

  const handleCatClick = (name) => {
    setActiveCat(name);
    setPage("catdetail");
  };

  return (
    <AppShell title="Categories">
      <div className="slide-in-left mb-6">
        <h2 className="font-playfair text-2xl font-bold text-text-primary section-title-underline inline-block">
          Browse by Category
        </h2>
        <p className="text-[13.5px] text-text-muted mt-2">
          Explore news across {CATEGORIES.length} curated topics
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {CATEGORIES.map(({ name, color, light, image }, i) => (
          <CategoryCard
            key={name}
            name={name}
            color={color}
            light={light}
            image={image}
            count={countMap[name] ?? null} // Still passed, but not used for display
            delay={i * 0.04}
            onClick={() => handleCatClick(name)}
          />
        ))}
      </div>
    </AppShell>
  );
}
