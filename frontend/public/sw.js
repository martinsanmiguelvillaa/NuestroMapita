// Service Worker — PWA + Web Push
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
// Solo interceptar GETs del mismo origen; dejar pasar el resto sin tocar
// (el blanket fetch handler rompía requests en iOS)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then(r => r || Response.error())));
});

// Recibir notificación push
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let title = 'Nuestro Mapita';
  let body = 'Tenés algo nuevo.';
  let url = '/';
  let icon = '/icons/icon-192.png';
  try {
    const payload = e.data.json();
    title = payload.title || title;
    body  = payload.body  || body;
    url   = payload.url   || url;
    if (payload.icon) icon = payload.icon;
  } catch {
    // Payload no es JSON válido — usamos defaults
  }
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icons/icon-192.png',
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
