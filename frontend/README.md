# NewsCrest — AI-Powered Personalized News Portal

> **"Not just news. Your news."**

A premium, editorial-aesthetic React frontend for an AI-powered personalized news portal. Built with React 18 + Vite + Tailwind CSS.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS v3 | Utility-first styling |
| Lucide Icons | SVG icon set (supplemental) |
| React Router DOM | Client-side routing (optional upgrade) |

---

## Project Structure

```
newscrest/
├── index.html                        # Vite entry HTML
├── vite.config.js                    # Vite config
├── tailwind.config.js                # Tailwind custom theme
├── postcss.config.js                 # PostCSS for Tailwind
├── package.json
│
└── src/
    ├── main.jsx                      # React DOM root
    ├── App.jsx                       # Page router / app root
    ├── index.css                     # Tailwind base + custom utilities
    │
    ├── context/
    │   └── AppContext.jsx            # Global state: page, article, category
    │
    ├── data/
    │   └── newsData.js               # Sample news, categories, hatke, chat data
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.jsx           # Fixed maroon sidebar with nav
    │   │   ├── TopBar.jsx            # Sticky top header
    │   │   └── AppShell.jsx          # Sidebar + TopBar wrapper for auth pages
    │   │
    │   ├── ui/
    │   │   ├── Icons.jsx             # All custom SVG icons (no emojis)
    │   │   ├── Logo.jsx              # Logo (light + dark variants)
    │   │   └── Primitives.jsx        # Button, Badge, Pill, Input, Toggle, Tabs, etc.
    │   │
    │   └── cards/
    │       └── NewsCard.jsx          # NewsCard, HeadlineCard, AlertItem
    │
    └── pages/
        ├── LandingPage.jsx           # Marketing/home page
        ├── LoginPage.jsx             # Auth login
        ├── SignupPage.jsx            # Multi-step onboarding signup
        ├── DashboardPage.jsx         # For You / Home feed
        ├── ExplorePage.jsx           # Search & Explore
        ├── CategoriesPage.jsx        # Category grid
        ├── CategoryDetailPage.jsx    # Single category articles
        ├── ArticleDetailPage.jsx     # Full article reader + AI widgets
        ├── ChatbotPage.jsx           # AI news chatbot
        ├── ComparePage.jsx           # AI comparison tool
        ├── SavedPage.jsx             # Bookmarked articles
        ├── NotificationsPage.jsx     # Notification center
        ├── NotesPage.jsx             # Notes / mini task manager
        ├── HatkePage.jsx             # Funny short-form news
        └── ProfilePage.jsx           # Profile & settings
```

---

## Setup & Run

### 1. Install dependencies

```bash
npm install
```

### 2. Start dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 3. Build for production

```bash
npm run build
```

---

## Design System

### Color Palette

| Token | Hex | Role |
|---|---|---|
| `maroon` | `#741515` | Primary brand, sidebar, buttons |
| `tan` | `#C1856D` | Secondary accents, hover |
| `wheat` | `#E6CFA9` | Cards, surfaces, AI panels |
| `lemon` | `#FBF9D1` | Featured highlights, callouts |
| `smoke` | `#F1EEEE` | Main background |
| `gold` | `#DAA520` | Borders, dividers, luxury detail |

### Typography

| Usage | Font |
|---|---|
| Headlines, titles, article names | Playfair Display |
| Body, UI, buttons, metadata | Inter |

### Color Usage Rule (60-20-10-10)
- **60%** → `#F1EEEE` smoke background
- **20%** → white/off-white surfaces
- **10%** → `#741515` maroon accents
- **10%** → wheat, tan, gold details

---

## Pages Overview

| Page | Route Key | Description |
|---|---|---|
| Landing | `landing` | Marketing page with hero, features, profiles, CTA |
| Login | `login` | Email + password auth |
| Signup | `signup` | 3-step onboarding with profile + interests |
| Dashboard | `dashboard` | Personalized For You feed |
| Explore | `explore` | Search + tabbed news discovery |
| Categories | `categories` | 15-category tile grid |
| Category Detail | `catdetail` | Single category news listing |
| Article Detail | `article` | Full article + AI summary widgets |
| AI Chatbot | `chatbot` | Conversational news assistant |
| AI Compare | `compare` | Side-by-side topic comparison |
| Saved | `saved` | Bookmarked articles |
| Notifications | `notifications` | Alert center with types |
| Notes | `notes` | Pinnable note cards with due dates |
| Hatke | `hatke` | Witty short-form news cards |
| Profile | `profile` | User settings + notification toggles |

---

## Connecting to Backend (MERN)

When your backend is ready, replace the sample data in `src/data/newsData.js` with API calls:

```js
// Example: fetch from your Express API
const res = await fetch('http://localhost:5000/api/news?category=Technology')
const data = await res.json()
```

Recommended approach:
- Create `src/hooks/useNews.js` for data fetching with `useEffect`
- Create `src/hooks/useAuth.js` for JWT token handling
- Replace `AppContext` page state with `react-router-dom` routes for production

---

## Notes

- All navigation is handled via `AppContext` (`setPage`) — no `react-router-dom` routes needed for the prototype
- All emojis have been replaced with SVG icons from `src/components/ui/Icons.jsx`
- Tailwind custom tokens (maroon, wheat, gold, etc.) are defined in `tailwind.config.js`
- Fonts are loaded from Google Fonts in `index.html`
