const CACHE_VERSION = 'helpdesk-offline-v3';
const scoped = (value) => new URL(value, self.registration.scope).href;
self.addEventListener('install', (event) => {
  event.waitUntil(fetch(scoped('./precache-manifest.json'), { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error('Precache indisponível'); return r.json(); }).then((files) => caches.open(CACHE_VERSION).then((cache) => cache.addAll(files.map(scoped)))));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('helpdesk-offline-') && key !== CACHE_VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () => (await caches.match(event.request, { ignoreSearch: true })) || caches.match(scoped('./offline.html'))));
  } else {
    event.respondWith(caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request)));
  }
});
self.addEventListener('message', (event) => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
