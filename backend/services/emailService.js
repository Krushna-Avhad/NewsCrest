// services/emailService.js
import nodemailer from "nodemailer";

// ── Check credentials at CALL TIME (not module load time) ────────────────────
function isEmailConfigured() {
  return !!(
    process.env.EMAIL_USER &&
    process.env.EMAIL_USER.trim() !== "" &&
    process.env.EMAIL_USER !== "your_email@gmail.com" &&
    process.env.EMAIL_PASS &&
    process.env.EMAIL_PASS.trim() !== "" &&
    process.env.EMAIL_PASS !== "your_16char_app_password"
  );
}

// ── Fresh transporter per send — always reads current env ────────────────────
function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER?.trim(),
      pass: process.env.EMAIL_PASS?.trim(),
    },
  });
}

// ── Retry helper — exponential backoff ✅ ADDED ───────────────────────────────
async function withRetry(fn, maxAttempts = 3, label = "email") {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const waitMs = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
      console.warn(`⚠️  ${label} attempt ${attempt}/${maxAttempts} failed: ${err.message}. Retrying in ${waitMs}ms...`);
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, waitMs));
    }
  }
  throw lastError;
}

// ── Verify on startup ────────────────────────────────────────────────────────
export function verifyEmailConnection() {
  if (!isEmailConfigured()) {
    console.warn("⚠️  Email not configured — OTP/alert emails will be skipped.");
    console.warn("   Set EMAIL_USER and EMAIL_PASS (Gmail App Password) in backend/.env");
    return;
  }
  getTransporter().verify((error) => {
    if (error) {
      console.error("❌ Email transporter error:", error.message);
    } else {
      console.log(`✅ Email ready — sending as ${process.env.EMAIL_USER?.trim()}`);
    }
  });
}

// ── HTML wrapper ─────────────────────────────────────────────────────────────
const emailWrapper = (bodyHtml) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      body { margin:0; padding:0; background:#f4f4f4; font-family:Arial,sans-serif; }
      .container { max-width:600px; margin:40px auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
      .header { background:#741515; padding:24px 32px; text-align:center; }
      .header h1 { color:#DAA520; margin:0; font-size:28px; letter-spacing:1px; font-family:Georgia,serif; }
      .header span { color:#fff; font-size:13px; }
      .body { padding:32px; color:#333; }
      .footer { background:#f9f9f9; padding:16px 32px; text-align:center; font-size:12px; color:#999; border-top:1px solid #eee; }
      .btn { display:inline-block; padding:12px 28px; background:#741515; color:#fff !important; border-radius:6px; text-decoration:none; font-weight:bold; margin-top:16px; }
      .otp-box { font-size:40px; font-weight:bold; letter-spacing:10px; color:#741515; text-align:center; padding:20px; background:#fdf8f3; border-radius:8px; margin:20px 0; border:2px dashed #DAA520; }
      .article-item { border-bottom:1px solid #f0e6d3; padding:20px 0; }
      .article-item:last-child { border-bottom:none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>NewsCrest</h1>
        <span>Your Daily News Companion</span>
      </div>
      <div class="body">${bodyHtml}</div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} NewsCrest · Manage preferences in your profile settings.
      </div>
    </div>
  </body>
  </html>
`;

// ── sendOtpEmail ──────────────────────────────────────────────────────────────
export const sendOtpEmail = async (email, otp) => {
  if (!isEmailConfigured()) {
    console.warn(`⚠️  sendOtpEmail: email not configured.`);
    console.warn(`   DEV OTP for ${email}: ${otp}`);
    return;
  }
  const body = `
    <h2 style="color:#741515;">Verify Your Email</h2>
    <p>Welcome to <strong>NewsCrest</strong>! Use the OTP below to verify your email address.</p>
    <div class="otp-box">${otp}</div>
    <p style="color:#777;font-size:14px;">⏳ Valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
    <p>If you did not create an account, please ignore this email.</p>
  `;
  await withRetry(() => getTransporter().sendMail({
    from:    `"NewsCrest" <${process.env.EMAIL_USER?.trim()}>`,
    to:      email,
    subject: "🔐 Your NewsCrest Verification OTP",
    html:    emailWrapper(body),
  }), 3, `OTP to ${email}`);
  console.log(`✅ OTP email sent to ${email}`);
};

// ── sendNewsAlertEmail ────────────────────────────────────────────────────────
export const sendNewsAlertEmail = async (email, newsData) => {
  if (!isEmailConfigured()) {
    console.warn("sendNewsAlertEmail: skipped — email not configured.");
    return;
  }
  const { title, description, link, category = "General" } = newsData;
  const body = `
    <p style="color:#741515;font-weight:bold;text-transform:uppercase;font-size:13px;">📰 ${category} Alert</p>
    <h2 style="color:#2A1F1F;margin-top:4px;">${title}</h2>
    <p style="color:#555;line-height:1.7;">${description}</p>
    ${link ? `<a href="${link}" class="btn">Read Full Story →</a>` : ""}
  `;
  await withRetry(() => getTransporter().sendMail({
    from:    `"NewsCrest Alerts" <${process.env.EMAIL_USER?.trim()}>`,
    to:      email,
    subject: `📰 NewsCrest: ${title}`,
    html:    emailWrapper(body),
  }), 3, `newsAlert to ${email}`);
  console.log(`✅ Alert email sent to ${email}`);
};

// ── sendAlertEmail (legacy, plain text) ──────────────────────────────────────
export const sendAlertEmail = async (email, message) => {
  if (!isEmailConfigured()) { console.warn("sendAlertEmail: skipped."); return; }
  await getTransporter().sendMail({
    from:    `"NewsCrest" <${process.env.EMAIL_USER?.trim()}>`,
    to:      email,
    subject: "🚨 News Alert",
    text:    message,
  });
};

// ── sendBulkNewsAlert ─────────────────────────────────────────────────────────
export const sendBulkNewsAlert = async (emails, newsData) => {
  if (!emails?.length) return { sent: 0, failed: 0 };
  if (!isEmailConfigured()) {
    console.warn(`sendBulkNewsAlert: skipped. Would have sent to ${emails.length} users.`);
    return { sent: 0, failed: 0 };
  }
  const results = await Promise.allSettled(emails.map((e) => sendNewsAlertEmail(e, newsData)));
  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(`📧 Bulk alert — Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed };
};

// ── sendDigestEmail ───────────────────────────────────────────────────────────
// options: { subject, heading, subheading }  — all optional, have nice defaults
export const sendDigestEmail = async (email, articles, options = {}) => {
  if (!isEmailConfigured()) {
    console.warn(`sendDigestEmail: skipped. Would send ${articles.length} articles to ${email}`);
    return;
  }

  const {
    subject     = "📅 Your Daily NewsCrest Digest",
    heading     = "📅 Your Daily News Digest",
    subheading  = "Here are today's top stories matching your interests:",
  } = options;

  const articlesHtml = articles.map((a) => `
    <div class="article-item">
      <p style="color:#741515;font-size:12px;font-weight:bold;text-transform:uppercase;margin:0 0 6px 0;">${a.category || "News"}</p>
      <h3 style="color:#2A1F1F;margin:0 0 8px 0;font-size:17px;line-height:1.4;">${a.title}</h3>
      <p style="color:#7A6A6A;margin:0 0 8px 0;font-size:13px;">
        ${a.source || ""}${a.source && a.publishedAt ? " · " : ""}${a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
      </p>
      <p style="color:#5B4B4B;margin:0 0 12px 0;line-height:1.6;font-size:14px;">
        ${a.summary || (a.content || "").substring(0, 150)}${!a.summary ? "..." : ""}
      </p>
      ${a.url ? `<a href="${a.url}" class="btn" style="font-size:13px;padding:8px 20px;">Read More →</a>` : ""}
    </div>
  `).join("");

  const body = `
    <h2 style="color:#741515;margin-top:0;">${heading}</h2>
    <p style="color:#777;margin-bottom:24px;font-size:14px;">${subheading}</p>
    ${articlesHtml}
  `;

  await withRetry(() => getTransporter().sendMail({
    from:    `"NewsCrest" <${process.env.EMAIL_USER?.trim()}>`,
    to:      email,
    subject,
    html:    emailWrapper(body),
  }), 3, `digest to ${email}`);
  console.log(`✅ Digest email (${articles.length} articles) sent to ${email}`);
};
