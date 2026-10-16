const CACHE_NAME = 'ghostchat-v5';

// Handle SKIP_WAITING message from the page (sent when a new SW is found)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Assets to pre-cache during SW install
// IMPORTANT: Only cache files we KNOW exist. Failing to fetch any of these
// aborts the entire install, which breaks PWA on iOS completely.
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png'
  // Audio files intentionally excluded: they may 404 and we don't want
  // a missing audio file to prevent the PWA from installing
];

// ─── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // addAll will reject if ANY asset fails; use individual puts with
        // catch so one missing asset never kills the whole install
        return Promise.all(
          PRECACHE_ASSETS.map((url) =>
            fetch(url)
              .then((resp) => {
                if (resp.ok) {
                  return cache.put(url, resp);
                }
              })
              .catch((err) => {
                console.warn('[SW] Pre-cache failed for:', url, err);
              })
          )
        );
      })
      .then(() => {
        console.log('[SW] Install complete.');
        // skipWaiting on first install so the app is immediately controlled
        return self.skipWaiting();
      })
  );
});

// ─── ACTIVATE ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removing stale cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activated & claimed clients.');
      return self.clients.claim();
    })
  );
});

// ─── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET and backend/WebSocket traffic entirely
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/uploads')
  ) {
    return; // Let the browser handle it
  }

  // 2. SPA navigation: network-first, fall back to cached /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/index.html'))
        .then((resp) => resp || caches.match('/index.html'))
    );
    return;
  }

  // 3. Vite hashed assets (JS/CSS chunks with content hash in filename):
  //    These are IMMUTABLE — safe to serve from cache forever.
  //    Pattern: /assets/index-AbCdEf12.js  or  /assets/index-AbCdEf12.css
  if (url.pathname.startsWith('/assets/') && /\.[a-f0-9]{8,}\./.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((resp) => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return resp;
        });
      })
    );
    return;
  }

  // 4. Static public assets (icons, manifest, audio): cache-first with background revalidate
  const isStaticAsset =
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        // Stale-while-revalidate
        const fetchPromise = fetch(request)
          .then((resp) => {
            if (resp && resp.ok) {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return resp;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 5. Everything else: network-first, no caching
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── PUSH NOTIFICATIONS (future-proof) ──────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    self.registration.showNotification(data.title || 'GhostChat', {
      body: data.body || 'New message',
      icon: '/icon-192.png',
      badge: '/favicon-32x32.png',
      data: { url: data.url || '/' }
    });
  } catch {}
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
