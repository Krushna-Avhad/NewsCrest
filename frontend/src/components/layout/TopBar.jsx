// src/components/layout/TopBar.jsx
import { useApp } from "../../context/AppContext";
import { SearchIcon, BellIcon, UserIcon } from "../ui/Icons";

function ArrowLeftIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function HamburgerIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export default function TopBar({ title, onMenuClick }) {
  const { setPage, goBack, canGoBack, alertCount } = useApp();

  return (
    <header className="bg-white border-b border-gold/30 px-4 md:px-9 py-3 flex flex-col md:flex-row md:items-center md:justify-between sticky top-0 z-50 shadow-[0_2px_12px_rgba(42,31,31,0.05)]">

      {/* Mobile top row — hamburger + icons */}
      <div className="flex items-center justify-between md:hidden mb-2">
        <button
          onClick={onMenuClick}
          className="w-9 h-9 rounded-[10px] border border-gold/30 bg-smoke flex items-center justify-center cursor-pointer text-text-secondary hover:bg-wheat hover:border-gold hover:text-maroon transition-all duration-200"
        >
          <HamburgerIcon size={18} />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage("explore")}
            className="w-9 h-9 rounded-[10px] border border-gold/30 bg-smoke flex items-center justify-center cursor-pointer text-text-secondary hover:bg-wheat hover:border-gold hover:text-maroon transition-all duration-200"
          >
            <SearchIcon size={16} />
          </button>

          <button
            onClick={() => setPage("notifications")}
            className="relative w-9 h-9 rounded-[10px] border border-gold/30 bg-smoke flex items-center justify-center cursor-pointer text-text-secondary hover:bg-wheat hover:border-gold hover:text-maroon transition-all duration-200"
          >
            <BellIcon size={16} />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-maroon text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setPage("profile")}
            className="w-9 h-9 rounded-[10px] border border-gold/30 bg-smoke flex items-center justify-center cursor-pointer text-text-secondary hover:bg-wheat hover:border-gold hover:text-maroon transition-all duration-200"
          >
            <UserIcon size={16} />
          </button>
        </div>
      </div>

      {/* Title row — back button + page title */}
      <div className="flex items-center gap-3">
        {canGoBack && (
          <button
            onClick={goBack}
            title="Go back"
            className="w-8 h-8 rounded-[8px] border border-gold/30 bg-smoke flex items-center justify-center cursor-pointer text-text-secondary hover:bg-wheat hover:border-gold hover:text-maroon transition-all duration-200"
          >
            <ArrowLeftIcon size={15} />
          </button>
        )}
        <h1 className="font-playfair text-[18px] md:text-[20px] font-bold text-text-primary">
          {title}
        </h1>
      </div>

      {/* Desktop right icons — hidden on mobile */}
      <div className="hidden md:flex items-center gap-3">
        <button
          onClick={() => setPage("explore")}
          title="Search"
          className="w-9 h-9 rounded-[10px] border border-gold/30 bg-smoke flex items-center justify-center cursor-pointer text-text-secondary hover:bg-wheat hover:border-gold hover:text-maroon transition-all duration-200"
        >
          <SearchIcon size={16} />
        </button>

        <button
          onClick={() => setPage("notifications")}
          title="Notifications"
          className="relative w-9 h-9 rounded-[10px] border border-gold/30 bg-smoke flex items-center justify-center cursor-pointer text-text-secondary hover:bg-wheat hover:border-gold hover:text-maroon transition-all duration-200"
        >
          <BellIcon size={16} />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-maroon text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setPage("profile")}
          title="Profile"
          className="w-9 h-9 rounded-[10px] border border-gold/30 bg-smoke flex items-center justify-center cursor-pointer text-text-secondary hover:bg-wheat hover:border-gold hover:text-maroon transition-all duration-200"
        >
          <UserIcon size={16} />
        </button>
      </div>

    </header>
  );
}