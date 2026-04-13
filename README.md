# NewsCrest 📰

An AI-powered personalized news portal with real-time feeds, smart summaries, fact-checking, and a built-in chatbot — built with React + Node.js + MongoDB.

---

## Features

- **Personalized News Feed** — articles curated based on user interests, location, and reading history
- **AI Summaries** — every article comes with a concise AI-generated summary
- **Hatke Summary** — a unique "alternative angle" summary powered by AI
- **Trending & Headlines** — real-time trending stories and top headlines
- **Explore & Search** — full-text search across all articles
- **Categories** — browse news by topic (Technology, Finance, Sports, Health, etc.)
- **Story Timeline** — track how a news story has evolved over time
- **Perspectives** — compare multiple viewpoints on the same story
- **Compare Articles** — side-by-side comparison of two articles
- **Fact Check** — AI-assisted fact checking on news claims
- **Chatbot** — conversational AI assistant for news queries
- **Save Articles** — bookmark articles to read later
- **Notes** — create and manage notes linked to articles
- **Notifications / Alerts** — breaking news and personalized alerts with unread badge
- **Reading Preferences** — choose feed layout and text size (Small / Medium / Large)
- **Profile & Settings** — edit name, city, state, interests, notification prefs, and password
- **OTP Email Verification** — secure signup with one-time password via email
- **JWT Authentication** — protected routes with auto-login via stored token

---

## Tech Stack

### Frontend
| Tech | Version |
|------|---------|
| React | 18 |
| Vite | 5 |
| Tailwind CSS | 3 |
| Lucide React | 0.363 |
| Axios | 1.14 |
| React Router DOM | 6 |

### Backend
| Tech | Version |
|------|---------|
| Node.js + Express | 4.18 |
| MongoDB + Mongoose | 9 |
| JWT (jsonwebtoken) | 9 |
| bcryptjs | 3 |
| Nodemailer | 8 |
| Google Generative AI | 0.24 |
| Groq SDK | 1.1 |
| OpenAI | 6 |
| node-cron | 4 |
| nodemon | 3 |

---

## Project Structure

```
NewsCrest/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── cards/          # NewsCard
│   │   │   ├── layout/         # AppShell, TopBar, Sidebar, CategoryStrip
│   │   │   ├── timeline/       # StoryTimelineCard
│   │   │   └── ui/             # Icons, Logo, Primitives
│   │   ├── context/
│   │   │   └── AppContext.jsx  # Global state (auth, news, prefs)
│   │   ├── data/               # Static data (India locations, etc.)
│   │   ├── hooks/              # useSpeechSynthesis
│   │   ├── pages/              # All page components
│   │   ├── services/
│   │   │   └── api.js          # All API calls
│   │   ├── App.jsx             # Router + page map
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Global styles + text size classes
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── backend/
    ├── config/
    │   └── db.js               # MongoDB connection
    ├── controllers/            # Route logic
    │   ├── authController.js
    │   ├── newsController.js
    │   ├── chatbotController.js
    │   ├── compareController.js
    │   ├── factCheckController.js
    │   ├── hatkeController.js
    │   ├── perspectiveController.js
    │   ├── searchController.js
    │   ├── storyTimelineController.js
    │   ├── alertController.js
    │   └── taskController.js
    ├── middleware/
    │   └── authMiddleware.js   # JWT guard
    ├── models/                 # Mongoose schemas
    │   ├── User.js
    │   ├── News.js
    │   ├── StoryTimeline.js
    │   ├── Comparison.js
    │   ├── Chatbot.js
    │   ├── Alert.js
    │   └── Task.js
    └── server.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- API keys for Google Generative AI / Groq / OpenAI

---

### 1. Clone the repo

```bash
git clone https://github.com/your-username/NewsCrest.git
cd NewsCrest
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/newscrest
JWT_SECRET=your_jwt_secret_here

# Email (for OTP verification)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# AI Keys
GOOGLE_AI_API_KEY=your_google_ai_key
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key

# News API (if used)
NEWS_API_KEY=your_news_api_key
```

Start the backend:

```bash
npm run dev
```

Backend runs on `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` folder:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Available Scripts

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start with nodemon |

---

## User Profile Types

When signing up, users are assigned one of the following profile types:

- Student
- IT Employee
- Elderly
- Business Person
- Homemaker
- General Reader

The profile type influences the personalized news feed.

---

## Environment Variables Summary

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_API_BASE_URL` | frontend `.env` | Backend API base URL |
| `PORT` | backend `.env` | Express server port |
| `MONGO_URI` | backend `.env` | MongoDB connection string |
| `JWT_SECRET` | backend `.env` | Secret for signing JWT tokens |
| `EMAIL_USER` | backend `.env` | Gmail address for OTP emails |
| `EMAIL_PASS` | backend `.env` | Gmail app password |
| `GOOGLE_AI_API_KEY` | backend `.env` | Google Generative AI key |
| `GROQ_API_KEY` | backend `.env` | Groq AI key |
| `OPENAI_API_KEY` | backend `.env` | OpenAI key |

---

## License

MIT
