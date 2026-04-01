import Alert from "../models/Alert.js";
import User from "../models/User.js";
import News from "../models/News.js";
import nodemailer from "nodemailer";

// ✅ EMAIL CONFIGURATION
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ✅ CREATE ALERT FOR USER
export const createAlert = async (userId, articleId, type, priority = 'medium', metadata = {}) => {
  try {
    const [user, article] = await Promise.all([
      User.findById(userId),
      News.findById(articleId)
    ]);

    if (!user || !article) {
      throw new Error('User or article not found');
    }

    // Check user notification preferences
    if (!user.notificationPreferences.emailAlerts && type === 'email') {
      return null;
    }

    const alert = await Alert.create({
      userId,
      articleId,
      type,
      title: article.title,
      message: generateAlertMessage(article, type),
      priority,
      metadata: {
        ...metadata,
        category: article.category,
        location: article.location?.city || article.location?.state,
        keywords: article.tags,
        relevanceScore: calculateRelevanceScore(user, article)
      }
    });

    // Send email if enabled
    if (user.notificationPreferences.emailAlerts && shouldSendEmail(type, priority)) {
      await sendEmailAlert(user.email, alert, article);
      alert.isEmailSent = true;
      await alert.save();
    }

    return alert;
  } catch (error) {
    console.error('Error creating alert:', error);
    return null;
  }
};

// ✅ GENERATE ALERT MESSAGE
function generateAlertMessage(article, type) {
  const messages = {
    breaking: `🚨 Breaking News: ${article.title}`,
    personalized: `📰 News for you: ${article.title}`,
    location: `📍 Local news from your area: ${article.title}`,
    interest: `🎯 News matching your interests: ${article.title}`,
    trending: `🔥 Trending now: ${article.title}`,
    daily_digest: `📅 Daily digest includes: ${article.title}`
  };

  return messages[type] || `📰 ${article.title}`;
}

// ✅ CALCULATE RELEVANCE SCORE
function calculateRelevanceScore(user, article) {
  let score = 0.5; // Base score

  // Interest matching
  if (user.interests && user.interests.includes(article.category)) {
    score += 0.3;
  }

  // Location matching
  if (user.city && article.location?.city === user.city) {
    score += 0.2;
  }
  if (user.state && article.location?.state === user.state) {
    score += 0.1;
  }

  // Profile type relevance
  const profileCategories = getProfileCategories(user.profileType);
  if (profileCategories.includes(article.category)) {
    score += 0.2;
  }

  return Math.min(score, 1.0);
}

// ✅ GET PROFILE CATEGORIES
function getProfileCategories(profileType) {
  const profileMap = {
    'Student': ['Education', 'Technology', 'Science', 'Career', 'Good News'],
    'IT Employee': ['Technology', 'Business', 'Finance', 'Science', 'World'],
    'Elderly': ['Health', 'Good News', 'Politics', 'Education', 'Local'],
    'Business Person': ['Business', 'Finance', 'Politics', 'Technology', 'World'],
    'Homemaker': ['Health', 'Education', 'Good News', 'Local', 'Fashion'],
    'General Reader': ['Top Headlines', 'World', 'India', 'Technology', 'Health']
  };
  
  return profileMap[profileType] || profileMap['General Reader'];
}

// ✅ SEND EMAIL ALERT
async function sendEmailAlert(email, alert, article) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: alert.title,
      html: generateEmailTemplate(alert, article)
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email alert sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// ✅ GENERATE EMAIL TEMPLATE
function generateEmailTemplate(alert, article) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>NewsCrest Alert</title>
      <style>
        body { font-family: Inter, Arial, sans-serif; margin: 0; padding: 20px; background-color: #F1EEEE; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.06); }
        .header { background: #741515; color: #FDF8F3; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .content { padding: 30px; }
        .alert-badge { display: inline-block; background: #DAA520; color: #741515; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
        .article-title { color: #2A1F1F; font-size: 20px; font-weight: 700; margin-bottom: 15px; line-height: 1.4; }
        .article-meta { color: #7A6A6A; font-size: 14px; margin-bottom: 20px; }
        .article-summary { color: #5B4B4B; line-height: 1.6; margin-bottom: 25px; }
        .cta-button { display: inline-block; background: #741515; color: #FDF8F3; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; }
        .footer { background: #F1EEEE; padding: 20px; text-align: center; color: #7A6A6A; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📰 NewsCrest Alert</h1>
        </div>
        <div class="content">
          <div class="alert-badge">${alert.type.toUpperCase()}</div>
          <h2 class="article-title">${alert.title}</h2>
          <div class="article-meta">
            ${article.source} • ${new Date(article.publishedAt).toLocaleDateString()} • ${article.readTime} min read
          </div>
          <div class="article-summary">
            ${article.summary || article.content?.substring(0, 200) + '...'}
          </div>
          <a href="${article.url}" class="cta-button">Read Full Article</a>
        </div>
        <div class="footer">
          <p>This alert was sent based on your preferences. Manage your notifications in your NewsCrest profile.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ✅ SHOULD SEND EMAIL
function shouldSendEmail(type, priority) {
  const emailRules = {
    breaking: true,
    personalized: priority === 'high',
    location: priority === 'high',
    interest: priority === 'high',
    trending: false,
    daily_digest: true
  };

  return emailRules[type] || false;
}

// ✅ PROCESS BREAKING NEWS ALERTS
export const processBreakingNewsAlerts = async () => {
  try {
    const breakingNews = await News.find({
      importance: 'breaking',
      publishedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });

    const users = await User.find({
      'notificationPreferences.breakingNews': true,
      isActive: true
    });

    for (const article of breakingNews) {
      for (const user of users) {
        await createAlert(user._id, article._id, 'breaking', 'urgent', {
          category: article.category,
          location: article.location?.city
        });
      }
    }

    console.log(`Processed ${breakingNews.length} breaking news alerts for ${users.length} users`);
  } catch (error) {
    console.error('Error processing breaking news alerts:', error);
  }
};

// ✅ PROCESS PERSONALIZED ALERTS
export const processPersonalizedAlerts = async () => {
  try {
    const users = await User.find({
      'notificationPreferences.personalizedAlerts': true,
      isActive: true
    });

    for (const user of users) {
      // Find relevant articles from last 24 hours
      const relevantArticles = await News.find({
        publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        $or: [
          { category: { $in: user.interests } },
          { 'location.city': user.city },
          { 'location.state': user.state }
        ]
      }).limit(5);

      for (const article of relevantArticles) {
        const relevanceScore = calculateRelevanceScore(user, article);
        if (relevanceScore > 0.7) {
          await createAlert(user._id, article._id, 'personalized', 'high', {
            relevanceScore
          });
        }
      }
    }

    console.log(`Processed personalized alerts for ${users.length} users`);
  } catch (error) {
    console.error('Error processing personalized alerts:', error);
  }
};

// ✅ PROCESS DAILY DIGEST
export const processDailyDigest = async () => {
  try {
    const users = await User.find({
      'notificationPreferences.dailyDigest': true,
      isActive: true
    });

    for (const user of users) {
      // Get top articles from last 24 hours
      const topArticles = await News.find({
        publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        $or: [
          { category: { $in: user.interests } },
          { trending: true },
          { importance: { $in: ['high', 'breaking'] } }
        ]
      }).sort({ publishedAt: -1 }).limit(10);

      if (topArticles.length > 0) {
        // Create a single digest alert
        const digestAlert = await Alert.create({
          userId: user._id,
          articleId: topArticles[0]._id, // Use first article as reference
          type: 'daily_digest',
          title: '📅 Your Daily News Digest',
          message: `Top ${topArticles.length} stories from the last 24 hours`,
          priority: 'medium',
          metadata: {
            digestArticles: topArticles.map(a => a._id),
            category: 'digest'
          }
        });

        // Send digest email
        if (user.notificationPreferences.emailAlerts) {
          await sendDigestEmail(user.email, topArticles);
          digestAlert.isEmailSent = true;
          await digestAlert.save();
        }
      }
    }

    console.log(`Processed daily digest for ${users.length} users`);
  } catch (error) {
    console.error('Error processing daily digest:', error);
  }
};

// ✅ SEND DIGEST EMAIL
async function sendDigestEmail(email, articles) {
  try {
    const articlesHtml = articles.map(article => `
      <div style="border-bottom: 1px solid #E6CFA9; padding: 20px 0; margin-bottom: 20px;">
        <h3 style="color: #2A1F1F; margin: 0 0 10px 0; font-size: 18px;">${article.title}</h3>
        <p style="color: #7A6A6A; margin: 0 0 10px 0; font-size: 14px;">
          ${article.source} • ${new Date(article.publishedAt).toLocaleDateString()}
        </p>
        <p style="color: #5B4B4B; margin: 0 0 15px 0; line-height: 1.5;">
          ${article.summary || article.content?.substring(0, 150) + '...'}
        </p>
        <a href="${article.url}" style="color: #741515; text-decoration: none; font-weight: 600;">Read More →</a>
      </div>
    `).join('');

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>NewsCrest Daily Digest</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; margin: 0; padding: 20px; background-color: #F1EEEE; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.06); }
          .header { background: #741515; color: #FDF8F3; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .content { padding: 30px; }
          .footer { background: #F1EEEE; padding: 20px; text-align: center; color: #7A6A6A; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Your Daily News Digest</h1>
          </div>
          <div class="content">
            ${articlesHtml}
          </div>
          <div class="footer">
            <p>This is your personalized daily digest. Manage your preferences in your NewsCrest profile.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '📅 Your Daily News Digest - NewsCrest',
      html: htmlTemplate
    };

    await transporter.sendMail(mailOptions);
    console.log(`Daily digest sent to ${email}`);
  } catch (error) {
    console.error('Error sending digest email:', error);
  }
}
