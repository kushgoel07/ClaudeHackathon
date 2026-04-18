const CACHE = 'vita-v4';
const ASSETS = ['/styles/app.css'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  if (url.pathname.startsWith('/api/') ||
      url.hostname.includes('api.anthropic.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('accounts.google.com')) {
    return;
  }

  if (e.request.mode === 'navigate' ||
      e.request.destination === 'document' ||
      url.pathname === '/' ||
      url.pathname === '/index.html') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then(c => c || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      if (wins.length > 0) { wins[0].focus(); wins[0].navigate(url); }
      else clients.openWindow(url);
    })
  );
});
