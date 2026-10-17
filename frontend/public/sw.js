const CACHE_NAME = 'ghostchat-v6';

// Assets to pre-cache during SW install
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
  '/icon-maskable-512.png',
  '/notification.mp3',
  '/send.mp3'
];

// Handle SKIP_WAITING message from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Individual puts with catch so one missing asset never aborts the whole install
        return Promise.all(
          PRECACHE_ASSETS.map((url) =>
            fetch(url, { cache: 'no-cache' })
              .then((resp) => {
                if (resp && resp.status === 200) {
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
        console.log('[SW] Pre-caching complete. Skip waiting.');
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
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Skip backend API, socket.io, uploads, and browser extensions
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/uploads') ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return;
  }

  // 2. SPA navigation: network-first, fall back to cached /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return resp;
        })
        .catch(() => {
          return caches.match(request)
            .then((cached) => cached || caches.match('/index.html') || caches.match('/'));
        })
    );
    return;
  }

  // 3. Vite assets (/assets/index-*.js, /assets/index-*.css):
  //    Cache-first with network fallback and background caching
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return resp;
        });
      })
    );
    return;
  }

  // 4. Static public assets (icons, manifest, audio): Cache-first with Stale-While-Revalidate
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
        const fetchPromise = fetch(request)
          .then((resp) => {
            if (resp && resp.status === 200) {
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

  // 5. Default fallback: Network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((resp) => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(request))
  );
});

// ─── PUSH NOTIFICATIONS ─────────────────────────────────────────────────────
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
  event.waitUntil(self.clients.openWindow(url));
});
