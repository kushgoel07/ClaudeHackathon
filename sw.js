const CACHE = 'vita-v4';
const ASSETS = ['/', '/index.html', '/styles/app.css'];

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
  // Never cache API calls
  if (e.request.url.includes('api.anthropic.com') ||
      e.request.url.includes('googleapis.com') ||
      e.request.url.includes('accounts.google.com')) return;

  // Network-first strategy: try network, fall back to cache (avoids stale content)
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Clone the response and update cache with fresh version
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
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
