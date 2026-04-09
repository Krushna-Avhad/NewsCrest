// src/App.jsx
import { AppProvider, useApp } from "./context/AppContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import OtpPage from "./pages/OtpPage";
import DashboardPage from "./pages/DashboardPage";
import ExplorePage from "./pages/ExplorePage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryDetailPage from "./pages/CategoryDetailPage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import ChatbotPage from "./pages/ChatbotPage";
import ComparePage from "./pages/ComparePage";
import SavedPage from "./pages/SavedPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotesPage from "./pages/NotesPage";
import HatkePage from "./pages/HatkePage";
import ProfilePage from "./pages/ProfilePage";
import StoryTimelinePage from "./pages/StoryTimelinePage";
import PerspectivesPage from "./pages/PerspectivesPage";

// Pages that require authentication
const PROTECTED = new Set([
  "dashboard",
  "explore",
  "categories",
  "catdetail",
  "article",
  "chatbot",
  "compare",
  "saved",
  "notifications",
  "notes",
  "hatke",
  "timeline",
  "profile",
  "perspectives",
]);

const PAGE_MAP = {
  landing: LandingPage,
  login: LoginPage,
  signup: SignupPage,
  otp: OtpPage,
  dashboard: DashboardPage,
  explore: ExplorePage,
  categories: CategoriesPage,
  catdetail: CategoryDetailPage,
  article: ArticleDetailPage,
  chatbot: ChatbotPage,
  compare: ComparePage,
  saved: SavedPage,
  notifications: NotificationsPage,
  notes: NotesPage,
  hatke: HatkePage,
  timeline: StoryTimelinePage,
  profile: ProfilePage,
  perspectives: PerspectivesPage,
};

// ── Text size class map ────────────────────────────────────────────────────────
const TEXT_SIZE_CLASS = {
  Small: "nc-text-small",
  Medium: "nc-text-medium",
  Large: "nc-text-large",
};

function Router() {
  const { page, user, readingPrefs } = useApp();

  // Redirect unauthenticated users away from protected pages
  const resolvedPage = PROTECTED.has(page) && !user ? "login" : page;

  const Page = PAGE_MAP[resolvedPage] || LandingPage;

  // ✅ FIXED: apply text size and language globally — no UI/design change
  const sizeClass = TEXT_SIZE_CLASS[readingPrefs?.textSize] || "nc-text-medium";
  const lang = readingPrefs?.language || "English";

  return (
    <div className={sizeClass} data-lang={lang}>
      <Page />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
