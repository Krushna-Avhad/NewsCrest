// usePushNotifications.js — place in NewsCrest/frontend/src/hooks/usePushNotifications.js
// Call this hook once in App.jsx (inside the logged-in route tree)

import { useEffect } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// The VAPID public key from your backend .env (VAPID_PUBLIC_KEY)
// Replace this string with your actual key after running: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "YOUR_VAPID_PUBLIC_KEY_HERE";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  useEffect(() => {
    // Only run if the browser supports push
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const token = localStorage.getItem("token");
    if (!token) return; // user not logged in

    async function registerAndSubscribe() {
      try {
        // 1. Register (or get existing) service worker
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // 2. Ask permission (no-op if already granted/denied)
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // 3. Check for existing push subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          // 4. Create new subscription
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        // 5. Send subscription to backend
        await fetch(`${BACKEND_URL}/api/push/subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(subscription),
        });
      } catch (err) {
        console.warn("Push registration failed:", err.message);
      }
    }

    registerAndSubscribe();
  }, []);
}