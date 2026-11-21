/* GOODSPOTLESS administrative notifications. No caching or public site interception. */
self.addEventListener("push", (event) => {
  let details = {};
  try {
    if (event.data) details = event.data.json();
  } catch {
    // An unparsable push still notifies the administrator without exposing details.
  }
  const title = "🧹 GOODSPOTLESS · Novo cliente";
  const body = typeof details.body === "string" ? details.body.slice(0, 130) : "Recebemos um novo pedido. Abra o painel para conferir.";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/goodspotless-icon-192.png",
      badge: "/goodspotless-icon-192.png",
      tag: typeof details.id === "string" ? `goodspotless-${details.id}` : "goodspotless-new-client",
      renotify: true,
      vibrate: [220, 120, 220],
      data: { url: "/admin" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const adminUrl = new URL("/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const open = clients.find((client) => new URL(client.url).pathname === "/admin");
      if (open) return open.focus();
      return self.clients.openWindow(adminUrl);
    }),
  );
});
