const CACHE_NAME = 'max-ai-cache-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/pt/offline',
  '/es/offline'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER cache API requests, Webhooks, Supabase, or POST/PUT/DELETE methods
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next/data') || // Next.js server-side data fetching
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('stripe.com')
  ) {
    return event.respondWith(fetch(event.request));
  }

  // 2. Cache First for static Next.js assets & public images
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Network First for navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          // Detect language to serve the right offline page
          const lang = url.pathname.startsWith('/es') ? 'es' : 'pt';
          return caches.match(`/${lang}/offline`)
            .then(cachedOffline => {
              if (cachedOffline) return cachedOffline;
              // Fallback to the root if language-specific fails
              return caches.match('/'); 
            });
        })
    );
    return;
  }

  // 4. Default strategy: Network First for everything else
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
