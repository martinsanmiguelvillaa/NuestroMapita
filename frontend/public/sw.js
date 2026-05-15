// Service Worker mínimo — necesario para que la PWA sea instalable
// y para que el Share Target API funcione.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));
