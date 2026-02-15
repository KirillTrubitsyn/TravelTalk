const CACHE_NAME = 'traveltalk-v9';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/traveltalk-icon.svg',
  '/icons/traveltalk-icon-192.png',
  '/icons/traveltalk-icon-512.png',
  '/icons/traveltalk-icon-180.png',
  '/icons/traveltalk-icon-152.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
