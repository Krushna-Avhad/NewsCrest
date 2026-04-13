// sw.js — place this in NewsCrest/frontend/public/sw.js
// Service Worker: receives push events even when the browser tab is closed

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "NewsCrest", body: event.data.text() };
  }

  const title = data.title || "NewsCrest";
  const options = {
    body: data.body || data.message || "You have a new notification",
    icon: "/vite.svg",          // swap for your actual logo path
    badge: "/vite.svg",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    requireInteraction: data.priority === "urgent",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If app is already open, focus it
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});