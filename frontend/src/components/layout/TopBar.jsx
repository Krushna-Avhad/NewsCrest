// src/components/layout/TopBar.jsx
import { useApp } from "../../context/AppContext";
import { LogoDark } from "../ui/Logo";
import { SearchIcon, BellIcon, UserIcon } from "../ui/Icons";

function ArrowLeftIcon({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default function TopBar({ title }) {
  const { setPage, goBack, canGoBack, alertCount, user } = useApp();

  return (
    <header className="bg-white border-b border-gold/30 px-9 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-[0_2px_12px_rgba(42,31,31,0.05)]">
      {/* Logo + Back Button + Title */}
      <div className="flex items-center gap-3">
        {canGoBack && (
          <button
            onClick={goBack}
            title="Go back"
            className="w-8 h-8 rounded-[8px] border border-gold/30 bg-smoke flex items-center justify-center cursor-pointer text-text-secondary transition-all duration-200 hover:bg-wheat hover:border-gold hover:text-maroon mr-1"
          >
            <ArrowLeftIcon size={15} />
          </button>
        )}

        {/* Smart Logo */}
        <button
          onClick={() => {
            if (user) {
              setPage("dashboard"); // Logged-in users go to Dashboard
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" }); // Landing page → scroll to top
            }
          }}
          className="bg-transparent border-none cursor-pointer p-0 hover:opacity-80 transition-opacity -ml-1"
        >
          <LogoDark size="md" />
        </button>

        <h1 className="font-playfair text-[20px] font-bold text-text-primary ml-2">
          {title}
        </h1>
      </div>

      {/* Right Side Icons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPage("explore")}
          title="Search"
          className="w-9 h-9 rounded-[10px] border border-gold/30 bg-smoke flex items-center justify-center cursor-pointer text-text-secondary transition-all duration-200 hover:bg-wheat hover:border-gold hover:text-maroon"
        >
          <SearchIcon size={16} />
        </button>

        <button
          onClick={() => setPage("notifications")}
          title="Notifications"
          className="relative w-9 h-9 rounded-[10px] border border-gold/30 bg-smoke flex items-center justify-center cursor-pointer text-text-secondary transition-all duration-200 hover:bg-wheat hover:border-gold hover:text-maroon"
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
          className="w-9 h-9 rounded-[10px] border border-gold/30 bg-smoke flex items-center justify-center cursor-pointer text-text-secondary transition-all duration-200 hover:bg-wheat hover:border-gold hover:text-maroon"
        >
          <UserIcon size={16} />
        </button>
      </div>
    </header>
  );
}
