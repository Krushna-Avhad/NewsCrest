# NewsCrest — Setup Guide

## 1. Configure Email (REQUIRED for OTP + Alerts)

Open `backend/.env` and replace these two lines with your actual values:

```
EMAIL_USER=yourname@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

**How to get your Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not already on)
3. Go to https://myaccount.google.com/apppasswords
4. Click **"Select app"** → choose **Mail**
5. Click **"Select device"** → choose **Windows Computer** (or Mac)
6. Click **Generate** → copy the 16-character code
7. Paste it as `EMAIL_PASS` in `backend/.env`

> ⚠️ Your normal Gmail password will NOT work here. You must use the App Password.

---

## 2. Install & Run

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 3. How Notifications Work

| Type | When it fires | Email sent to |
|------|--------------|---------------|
| **OTP** | On signup | Registered email |
| **Personalized** | Every 6 hours (cron) | Users with matching interests |
| **Breaking News** | Every hour (cron) | Users with Breaking News ON |
| **Daily Digest** | Daily at 8:00 AM | Users with Daily Digest ON |
| **Manual Email Alert** | From Notifications page panel | All / By category / Breaking |

Users control their preferences in **Profile → Notification Preferences**.

---

## 4. Trigger Alerts Manually (for testing)

From the **Notifications** page in the app, use the **"Send Email Alert"** panel to send test emails immediately.

Or via API (after login):
```
POST /api/alerts/trigger-personalized
POST /api/alerts/trigger-breaking
POST /api/alerts/trigger-digest
```
