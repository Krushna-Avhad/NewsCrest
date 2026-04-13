// src/App.jsx
import { AppProvider, useApp } from "./context/AppContext";
import { useEffect, useState } from "react";

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
import FactCheckPage from "./pages/FactCheckPage";
import SavedPage from "./pages/SavedPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotesPage from "./pages/NotesPage";
import HatkePage from "./pages/HatkePage";
import ProfilePage from "./pages/ProfilePage";
import StoryTimelinePage from "./pages/StoryTimelinePage";
import PerspectivesPage from "./pages/PerspectivesPage";

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
  factcheck: FactCheckPage,
  saved: SavedPage,
  notifications: NotificationsPage,
  notes: NotesPage,
  hatke: HatkePage,
  timeline: StoryTimelinePage,
  profile: ProfilePage,
  perspectives: PerspectivesPage,
};

function Router() {
  const { page, user, setPage, authLoading } = useApp();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // ✅ FIX: wait until AppContext finishes its token/getProfile check
    if (authLoading) return;

    const savedPage = localStorage.getItem("lastVisitedPage");

    if (user && savedPage && PROTECTED.has(savedPage)) {
      // Logged-in user — restore last page
      setPage(savedPage);
    } else if (user) {
      // Logged-in but no saved page — go to dashboard
      setPage("dashboard");
    }
    // If no user, page stays "landing" (AppContext default) — no setPage call
    // so lastVisitedPage is never corrupted by a spurious "landing" write

    setReady(true);
  }, [user, authLoading]); // ✅ re-runs when auth check completes

  // ✅ FIX: only save page when we are truly ready (auth resolved)
  // and never save "landing" or auth pages — prevents corrupting lastVisitedPage
  useEffect(() => {
    if (!ready) return;
    if (page && PROTECTED.has(page)) {
      localStorage.setItem("lastVisitedPage", page);
    }
  }, [page, ready]);

  // Show blank screen until auth check is done and page is restored
  if (!ready) {
    return <div className="min-h-screen bg-smoke" />;
  }

  // Protect routes — unauthenticated users trying to reach protected pages go to login
  const resolvedPage = PROTECTED.has(page) && !user ? "login" : page;
  const PageComponent = PAGE_MAP[resolvedPage] || LandingPage;

  return <PageComponent />;
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
