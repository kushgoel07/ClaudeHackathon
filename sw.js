const CACHE = 'vita-v1';
const ASSETS = ['/', '/index.html', '/styles/app.css', '/src/app.js',
  '/src/logStore.js', '/src/macroEngine.js', '/src/contextBuilder.js',
  '/src/claudeClient.js', '/src/parseClaudeResponse.js', '/src/voiceInput.js',
  '/src/photoInput.js', '/src/calendarClient.js', '/src/notificationManager.js',
  '/src/ui.js'];

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
  if (e.request.url.includes('api.anthropic.com') ||
      e.request.url.includes('googleapis.com') ||
      e.request.url.includes('accounts.google.com')) return;
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
