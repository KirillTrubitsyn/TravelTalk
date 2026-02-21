const CACHE_NAME = 'traveltalk-v15';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/traveltalk-icon.svg',
  '/icons/traveltalk-icon-192.png',
  '/icons/traveltalk-icon-512.png',
  '/icons/traveltalk-icon-180.png',
  '/icons/traveltalk-icon-152.png',
  '/icons/icon.svg',
  '/icons/favicon.ico'
];

// External resources to cache for offline use
const EXTERNAL_CACHE = [
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(ASSETS);
      // Cache external resources (best effort)
      for (const url of EXTERNAL_CACHE) {
        try { await cache.add(url); } catch (err) { console.warn('[SW] Failed to cache:', url); }
      }
    })
  );
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
  const url = e.request.url;

  // Never cache API requests
  if (url.includes('/api/')) return;

  // For flag images from CDN — cache-first with network fallback
  if (url.includes('flagcdn.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // For external CDN resources (mammoth.js etc.) — cache-first
  if (url.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // App shell — cache-first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful responses for same-origin requests
        if (response.ok && url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // If offline and nothing in cache, return the main page for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
