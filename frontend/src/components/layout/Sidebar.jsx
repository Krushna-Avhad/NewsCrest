// src/components/layout/Sidebar.jsx
import { useApp } from "../../context/AppContext";
import { Logo } from "../ui/Logo";
import {
  HomeIcon,
  SearchIcon,
  GridIcon,
  BotIcon,
  ScaleIcon,
  BookmarkIcon,
  BellIcon,
  NoteIcon,
  SettingsIcon,
  LaughIcon,
  TimelineIcon,
  PerspectivesIcon,
} from "../ui/Icons";

const NAV_ITEMS = [
  { section: "Main" },
  { id: "dashboard", label: "For You", Icon: HomeIcon },
  { id: "explore", label: "Explore", Icon: SearchIcon },
  { id: "categories", label: "Categories", Icon: GridIcon },
  { section: "AI Tools" },
  { id: "chatbot", label: "AI Chatbot", Icon: BotIcon },
  { id: "factcheck", label: "Fact Check", Icon: ScaleIcon },
  { section: "My Content" },
  { id: "saved", label: "Saved Articles", Icon: BookmarkIcon },
  { id: "notifications", label: "Notifications", Icon: BellIcon },
  { id: "notes", label: "Notes", Icon: NoteIcon },
  { section: "Discovery" },
  { id: "hatke", label: "Hatke", Icon: LaughIcon },
  { id: "timeline", label: "Story Timeline", Icon: TimelineIcon },
  { id: "perspectives", label: "Perspectives", Icon: PerspectivesIcon },
  { section: "" },
  { id: "profile", label: "Profile & Settings", Icon: SettingsIcon },
];

export default function Sidebar() {
  const { page, setPage, user, alertCount } = useApp();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-maroon flex flex-col z-[100] border-r border-white/10 overflow-y-auto">
      {/* Logo */}
      <div
        className="px-6 pt-7 pb-5 border-b border-white/8 cursor-pointer group"
        onClick={() => setPage("landing")}
      >
        <Logo />
        <div
          className="gold-line-animate mt-1.5 h-[1.5px] bg-gold origin-left"
          style={{ maxWidth: "80px", transform: "scaleX(0)", opacity: 0 }}
        />
        <div className="text-[10px] text-white/40 tracking-[2px] uppercase mt-1">
          Intelligence · News · You
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 py-4 flex-1">
        {NAV_ITEMS.map((item, i) => {
          if (item.section !== undefined) {
            return item.section ? (
              <div
                key={i}
                className="text-[9px] font-semibold tracking-[2px] uppercase text-white/35 px-3 pt-3 pb-1"
              >
                {item.section}
              </div>
            ) : (
              <div key={i} className="h-2" />
            );
          }

          const { id, label, Icon } = item;
          const active = page === id;
          // Show real alert count badge on notifications item
          const badge =
            id === "notifications" && alertCount > 0
              ? String(alertCount)
              : null;

          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-[10px] rounded-[10px] text-[13.5px] font-medium mb-0.5 cursor-pointer transition-all duration-200 relative border text-left
                ${
                  active
                    ? "bg-gold/15 text-white border-gold/30 nav-active-bar"
                    : "text-white/65 border-transparent hover:bg-white/8 hover:text-white hover:pl-3.5"
                }`}
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="bg-gold text-maroon-dark text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-white/8 pt-4">
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] bg-white/6 hover:bg-white/10 transition-colors duration-200 cursor-pointer"
          onClick={() => setPage("profile")}
        >
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-maroon-dark font-bold text-[13px] flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-white truncate">
              {user?.name || "Account"}
            </div>
            <div className="text-[10px] text-white/45">
              {user?.profileType || "Profile"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
