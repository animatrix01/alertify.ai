/* Alertify.ai — minimal service worker for Web Notifications + future FCM/Capacitor.
 * Keep this file plain JS (no bundling) so it stays stable across Vite/Capacitor builds.
 */
/* global self, clients */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/** Reserved for Firebase / native push when wired through Capacitor. */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const json = event.data.json();
    if (json?.title) {
      event.waitUntil(
        self.registration.showNotification(json.title, json.options || {}),
      );
    }
  } catch {
    /* ignore malformed push payloads */
  }
});

/** Main app can postMessage when SW path is preferred over window.showNotification. */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "SHOW_DISASTER_ALERT") return;
  const { title, options } = data.payload || {};
  if (!title) return;
  event.waitUntil(self.registration.showNotification(title, options || {}));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data?.url || "/alerts";
  let fullUrl;
  try {
    fullUrl = new URL(raw, self.location.origin).href;
  } catch {
    fullUrl = new URL("/alerts", self.location.origin).href;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullUrl);
        }
      }),
  );
});
