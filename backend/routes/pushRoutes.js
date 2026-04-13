// pushRoutes.js — place in NewsCrest/backend/routes/pushRoutes.js
// Mount in server.js:  app.use("/api/push", pushRoutes);

import express from "express";
import webpush from "web-push";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Lazy init — called on first use so dotenv has already loaded in server.js
let vapidInitialised = false;
function initVapid() {
  if (vapidInitialised) return;
  webpush.setVapidDetails(
    "mailto:" + (process.env.EMAIL_USER || "admin@newscrest.com"),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  vapidInitialised = true;
}

// POST /api/push/subscribe
// Saves the browser push subscription for the logged-in user
router.post("/subscribe", protect, async (req, res) => {
  try {
    initVapid();
    const subscription = req.body; // { endpoint, keys: { p256dh, auth } }
    if (!subscription?.endpoint) {
      return res.status(400).json({ message: "Invalid subscription object" });
    }

    await User.findByIdAndUpdate(req.user.id, {
      pushSubscription: subscription,
    });

    res.json({ message: "Push subscription saved" });
  } catch (err) {
    console.error("Push subscribe error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/push/unsubscribe
// Removes push subscription (e.g. user turns off notifications in profile)
router.post("/unsubscribe", protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $unset: { pushSubscription: "" },
    });
    res.json({ message: "Push subscription removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — import and call this from notificationService.js
// ─────────────────────────────────────────────────────────────────────────────

// sendPushToUser(userId, payload)
// payload = { title, body, url, priority }
export const sendPushToUser = async (userId, payload) => {
  try {
    initVapid();
    const user = await User.findById(userId).select("pushSubscription email");
    if (!user?.pushSubscription?.endpoint) return; // no subscription saved

    await webpush.sendNotification(
      user.pushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || "/",
        priority: payload.priority || "medium",
      })
    );
  } catch (err) {
    if (err.statusCode === 410) {
      // Subscription expired — clean it up
      await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: "" } });
      console.log(`Removed expired push subscription for user ${userId}`);
    } else {
      console.warn(`Push failed for ${userId}: ${err.message}`);
    }
  }
};