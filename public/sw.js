self.addEventListener("push", function (event) {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Docteur Taxi", body: event.data.text() };
  }
  const { title = "Docteur Taxi", body = "", url = "/tableau-de-bord/chauffeur", tag } = data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: tag ?? "mts-default",
      renotify: true,
      data: { url },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url ?? "/tableau-de-bord/chauffeur";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windowClients) {
        for (const client of windowClients) {
          if ("focus" in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});
