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
import { usePushNotifications } from "./hooks/usePushNotifications";

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

  // ✅ Register service worker + subscribe to push once user is logged in
  usePushNotifications();

  // Restore last visited page as soon as possible
  useEffect(() => {
    if (authLoading) return; // ✅ wait for auth check to finish

    const savedPage = localStorage.getItem("lastVisitedPage");
    if (user && savedPage && PROTECTED.has(savedPage)) {
      setPage(savedPage);
    } else if (!user) {
      setPage("landing");
    }
    setReady(true);
  }, [user, authLoading]); // ✅ depend on both

  // Save current page whenever it changes
  useEffect(() => {
    if (page && page !== "landing") {
      localStorage.setItem("lastVisitedPage", page);
    }
  }, [page]);

  // Show blank screen (no flash) until we restore the correct page
  if (!ready) {
    return <div className="min-h-screen bg-smoke" />;
  }

  // Protect routes
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
