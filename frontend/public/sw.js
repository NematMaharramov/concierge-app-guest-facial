// Minimal service worker for PWA installability (Part 10).
//
// Deliberately conservative: this app is multi-tenant and pages/branding
// are fetched live, so aggressively caching HTML/API responses risks
// showing one tenant's guest a stale or wrong-tenant page. Strategy:
//   - Static build assets (_next/static/**): cache-first (immutable, safe)
//   - Everything else (pages, API calls): network-first, falling back to
//     cache only when genuinely offline, so normal browsing always gets
//     fresh data when a connection is available.
const CACHE_NAME = 'concierge-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isStaticAsset = url.pathname.startsWith('/_next/static/');

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((cached) => cached || Response.error()))
  );
});
