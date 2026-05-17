// Service Worker — PWA + Web Push
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));

// Recibir notificación push
self.addEventListener('push', (e) => {
  if (!e.data) return;
  const { title, body, url } = e.data.json();
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icono-app.png',
      badge: '/icons/icono-app.png',
      data: { url },
    })
  );
});

// Click en la notificación → abrir la app en la URL indicada
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const target = e.notification.data?.url || '/';
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus().then((c) => c.navigate(target));
      return clients.openWindow(target);
    })
  );
});
