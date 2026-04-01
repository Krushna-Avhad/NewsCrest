// src/App.jsx
import { AppProvider, useApp } from "./context/AppContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
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
  "profile",
]);

const PAGE_MAP = {
  landing: LandingPage,
  login: LoginPage,
  signup: SignupPage,
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
  profile: ProfilePage,
};

function Router() {
  const { page, user } = useApp();

  // Redirect unauthenticated users away from protected pages
  const resolvedPage = PROTECTED.has(page) && !user ? "login" : page;

  const Page = PAGE_MAP[resolvedPage] || LandingPage;
  return <Page />;
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
