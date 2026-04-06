# NewsCrest Backend API Documentation

## Overview

NewsCrest is an AI-powered personalized news portal backend that provides comprehensive news management, personalization, AI features, and productivity tools.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Modules & Endpoints

### 1. User Management Module

#### Authentication (`/api/auth`)

- `POST /api/auth/signup` - Register new user
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "profileType": "Student",
    "interests": ["Technology", "Science"],
    "city": "Mumbai",
    "state": "Maharashtra",
    "notificationPreferences": {
      "emailAlerts": true,
      "breakingNews": true,
      "personalizedAlerts": true,
      "dailyDigest": false
    }
  }
  ```

- `POST /api/auth/login` - User login
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `GET /api/auth/profile` - Get user profile (authenticated)
- `PUT /api/auth/profile` - Update user profile (authenticated)
- `POST /api/auth/logout` - Logout (authenticated)

### 2. News Aggregation Module

#### News (`/api/news`)

- `GET /api/news` - Get all news (paginated)
- `GET /api/news/feed` - Get personalized feed (authenticated)
- `GET /api/news/headlines` - Get top headlines
- `GET /api/news/trending` - Get trending news
- `GET /api/news/category/:category` - Get category-specific news
- `GET /api/news/local` - Get local news (authenticated)
- `GET /api/news/good` - Get good news
- `GET /api/news/:id` - Get single article
- `POST /api/news/:id/save` - Save/bookmark article (authenticated)
- `DELETE /api/news/:id/save` - Remove saved article (authenticated)
- `GET /api/news/saved` - Get saved articles (authenticated)
- `POST /api/news/refresh` - Refresh news from external APIs

### 3. AI Assistant Module

#### Chatbot (`/api/chatbot`)

- `POST /api/chatbot/start` - Start new chat session (authenticated)
- `POST /api/chatbot/message` - Send message to chatbot (authenticated)
  ```json
  {
    "sessionId": "uuid-session-id",
    "message": "Show me latest AI news"
  }
  ```
- `GET /api/chatbot/history/:sessionId` - Get chat history (authenticated)
- `GET /api/chatbot/sessions` - Get all chat sessions (authenticated)
- `DELETE /api/chatbot/session/:sessionId` - End chat session (authenticated)
- `DELETE /api/chatbot/clear` - Clear all chat history (authenticated)

### 4. AI Comparison Engine

#### Comparison (`/api/compare`)

- `POST /api/compare` - Compare two news items (authenticated)
  ```json
  {
    "item1": {
      "title": "First article title",
      "content": "First article content..."
    },
    "item2": {
      "title": "Second article title", 
      "content": "Second article content..."
    }
  }
  ```
- `POST /api/compare/articles/:articleId1/:articleId2` - Compare two articles by ID (authenticated)
- `GET /api/compare/history` - Get comparison history (authenticated)
- `GET /api/compare/:comparisonId` - Get single comparison (authenticated)
- `DELETE /api/compare/:comparisonId` - Delete comparison (authenticated)

### 5. Saved Content Module

#### Bookmarks (integrated in News module)

- `POST /api/news/:id/save` - Save article
- `DELETE /api/news/:id/save` - Remove saved article  
- `GET /api/news/saved` - Get saved articles

### 6. Alerts & Notification Module

#### Alerts (`/api/alerts`)

- `GET /api/alerts` - Get user alerts (authenticated)
- `GET /api/alerts/unread-count` - Get unread alerts count (authenticated)
- `PUT /api/alerts/:alertId/read` - Mark alert as read (authenticated)
- `PUT /api/alerts/read-all` - Mark all alerts as read (authenticated)
- `DELETE /api/alerts/:alertId` - Delete alert (authenticated)
- `DELETE /api/alerts/clear` - Clear all alerts (authenticated)
- `POST /api/alerts/create` - Create custom alert (authenticated)
- `GET /api/alerts/statistics` - Get alert statistics (authenticated)

#### Admin Notification Triggers
- `POST /api/alerts/trigger-breaking` - Process breaking news alerts
- `POST /api/alerts/trigger-personalized` - Process personalized alerts  
- `POST /api/alerts/trigger-digest` - Process daily digest

### 7. Search & Explore Module

#### Search (`/api/search`)

- `GET /api/search` - Search news
  - Query params: `q` (required), `category`, `dateFrom`, `dateTo`, `source`, `sortBy`
- `GET /api/search/trending` - Get trending topics
- `GET /api/search/explore/category` - Explore by category
- `GET /api/search/explore/location` - Explore by location
- `GET /api/search/explore/source` - Explore by source
- `GET /api/search/suggestions` - Get search suggestions
- `GET /api/search/history` - Get search history (authenticated)
- `DELETE /api/search/history` - Clear search history (authenticated)

### 8. Notes & Productivity Module

#### Tasks/Notes (`/api/tasks`)

- `POST /api/tasks` - Create task/note (authenticated)
  ```json
  {
    "title": "Meeting notes",
    "content": "Discuss project timeline...",
    "type": "note",
    "dueDate": "2024-12-31",
    "tags": ["work", "important"],
    "priority": "high"
  }
  ```
- `POST /api/tasks/article/:articleId/note` - Create note from article (authenticated)
- `GET /api/tasks` - Get all tasks/notes (authenticated)
- `GET /api/tasks/:taskId` - Get single task (authenticated)
- `PUT /api/tasks/:taskId` - Update task (authenticated)
- `PUT /api/tasks/:taskId/toggle` - Toggle completion status (authenticated)
- `PUT /api/tasks/:taskId/pin` - Toggle pin status (authenticated)
- `DELETE /api/tasks/:taskId` - Delete task (authenticated)
- `GET /api/tasks/type/:type` - Get tasks by type (authenticated)
- `GET /api/tasks/deadlines` - Get upcoming deadlines (authenticated)
- `GET /api/tasks/statistics` - Get task statistics (authenticated)

### 9. Content Experience Module

#### Hatke & AI Content (`/api/hatke`)

- `GET /api/hatke` - Get hatke (funny) news
- `POST /api/hatke/article/:articleId/hatke` - Generate hatke summary (authenticated)
- `GET /api/hatke/quick` - Get quick summaries
- `GET /api/hatke/article/:articleId/simple` - Get simplified version (authenticated)
- `POST /api/hatke/article/:articleId/summary` - Generate AI summary (authenticated)
- `POST /api/hatke/batch-generate` - Batch generate hatke summaries (admin)
- `GET /api/hatke/categories` - Get funny news categories
- `GET /api/hatke/trending` - Get trending hatke news
- `GET /api/hatke/sentiment/:sentiment` - Get hatke news by sentiment
- `GET /api/hatke/article/:articleId/share` - Get shareable content (authenticated)

## Database Models

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  profileType: ['Student', 'IT Employee', 'Elderly', 'Business Person', 'Homemaker', 'General Reader'],
  interests: [String],
  country: String,
  state: String,
  city: String,
  notificationPreferences: {
    emailAlerts: Boolean,
    breakingNews: Boolean,
    personalizedAlerts: Boolean,
    dailyDigest: Boolean
  },
  readingHistory: [{ articleId, readAt, readTime }],
  savedArticles: [ObjectId],
  searchHistory: [{ query, searchedAt }],
  lastLogin: Date,
  isActive: Boolean
}
```

### News Model
```javascript
{
  title: String,
  content: String,
  summary: String,
  hatkeSummary: String,
  url: String,
  source: String,
  author: String,
  publishedAt: Date,
  category: ['Top Headlines', 'Good News', 'Finance', 'Business', 'Technology', ...],
  tags: [String],
  imageUrl: String,
  readTime: Number,
  location: { country, state, city },
  sentiment: ['positive', 'negative', 'neutral'],
  importance: ['low', 'medium', 'high', 'breaking'],
  trending: Boolean,
  engagement: { shares, comments, saves },
  aiGenerated: { summary, hatkeSummary, simplifiedVersion }
}
```

### Task Model
```javascript
{
  userId: ObjectId,
  title: String,
  content: String,
  type: ['note', 'reminder', 'article_note', 'deadline'],
  isPinned: Boolean,
  isCompleted: Boolean,
  dueDate: Date,
  articleId: ObjectId,
  tags: [String],
  priority: ['low', 'medium', 'high'],
  metadata: { articleTitle, articleUrl, category }
}
```

### Alert Model
```javascript
{
  userId: ObjectId,
  articleId: ObjectId,
  type: ['breaking', 'personalized', 'location', 'interest', 'trending', 'daily_digest'],
  title: String,
  message: String,
  priority: ['low', 'medium', 'high', 'urgent'],
  isRead: Boolean,
  isEmailSent: Boolean,
  metadata: { category, location, keywords, relevanceScore }
}
```

## Error Handling

All endpoints return consistent error responses:

```javascript
{
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Environment Variables

Required environment variables:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NEWS_API_KEY=your_news_api_key
GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_password
PORT=5000
NODE_ENV=development
```

## Features Implemented

✅ **User Management**: Complete authentication, profile management, role-based personalization
✅ **News Aggregation**: Multi-source news fetching, categorization, location-based news
✅ **Personalization Engine**: AI-driven recommendations based on user profile and behavior
✅ **AI Assistant**: Chatbot for news discovery, natural language queries
✅ **AI Comparison Engine**: Compare news articles with AI analysis
✅ **Saved Content**: Bookmark and manage saved articles
✅ **Alerts & Notifications**: Email alerts, in-app notifications, personalized alerts
✅ **Search & Explore**: Advanced search, filters, trending topics
✅ **Notes & Productivity**: Task management, article-linked notes, reminders
✅ **Content Experience**: Hatke funny summaries, AI summaries, simplified explanations

## API Usage Examples

### Get Personalized Feed
```bash
GET /api/news/feed
Authorization: Bearer <token>
```

### Search News
```bash
GET /api/search?q=artificial intelligence&category=Technology&sortBy=relevance
```

### Chat with AI Assistant
```bash
POST /api/chatbot/message
{
  "sessionId": "session-uuid",
  "message": "What's the latest news about AI?"
}
```

### Compare Articles
```bash
POST /api/compare
{
  "item1": {
    "title": "AI Breakthrough in Healthcare",
    "content": "Recent developments..."
  },
  "item2": {
    "title": "Healthcare Technology Advances", 
    "content": "New medical technologies..."
  }
}
```

This comprehensive backend provides all the functionality needed for the NewsCrest frontend application with robust AI features, personalization, and productivity tools.
