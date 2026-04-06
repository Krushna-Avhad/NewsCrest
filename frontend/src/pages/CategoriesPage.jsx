// src/pages/CategoriesPage.jsx
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import AppShell from "../components/layout/AppShell";
import { SectionHeader } from "../components/ui/Primitives";
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

// Static category definitions — counts will be shown from API data if available
const CATEGORIES = [
  { name: "Top Headlines", color: "#741515" },
  { name: "Technology", color: "#1e3a5f" },
  { name: "Finance", color: "#1a6b3a" },
  { name: "Sports", color: "#7c3aed" },
  { name: "Health", color: "#b91c1c" },
  { name: "Science", color: "#0369a1" },
  { name: "Business", color: "#92400e" },
  { name: "Entertainment", color: "#9d174d" },
  { name: "Politics", color: "#374151" },
  { name: "Education", color: "#065f46" },
  { name: "India", color: "#854d0e" },
  { name: "World", color: "#1e40af" },
  { name: "Local", color: "#166534" },
  { name: "Good News", color: "#0f766e" },
  { name: "Fashion", color: "#86198f" },
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

export default function CategoriesPage() {
  const { setPage, setActiveCat } = useApp();
  const [countMap, setCountMap] = useState({});

  useEffect(() => {
    newsAPI.getCategoryCounts()
      .then(counts => setCountMap(counts))
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
        {CATEGORIES.map(({ name, color }, i) => {
          const Icon = CAT_ICONS[name] || NewspaperIcon;
          const count = countMap[name] || null;
          return (
            <button
              key={name}
              onClick={() => handleCatClick(name)}
              style={{ animationDelay: `${i * 0.04}s` }}
              className="card-reveal relative bg-white rounded-card border border-gold-subtle shadow-card p-5 text-left cursor-pointer group hover:shadow-card-md hover:-translate-y-[2px] transition-all duration-200 overflow-hidden"
            >
              {/* Color accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px] rounded-t-card"
                style={{ background: color }}
              />

              <div
                className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-3 transition-all duration-200 group-hover:scale-105"
                style={{ background: `${color}18` }}
              >
                <Icon size={20} style={{ color }} />
              </div>

              <div className="font-playfair text-[15px] font-bold text-text-primary mb-1 group-hover:text-maroon transition-colors duration-200">
                {name}
              </div>
              <div className="text-[11px] text-text-muted">
                {count !== null ? `${count} articles` : "Browse stories"}
              </div>

              {/* Hover arrow */}
              <div
                className="absolute bottom-4 right-4 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                style={{ background: `${color}20` }}
              >
                <span style={{ color, fontSize: 12 }}>→</span>
              </div>
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}
