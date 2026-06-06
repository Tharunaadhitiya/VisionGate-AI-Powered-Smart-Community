const CACHE_NAME = 'visiongate-v2';
const STATIC_CACHE = 'visiongate-static-v2';
const NAV_CACHE = 'visiongate-nav-v2';
// build: 2026-06-05-2

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-192x192.png',
  '/icons/maskable-icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE && key !== NAV_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

const isStaticAsset = (url) => {
  const pathname = new URL(url).pathname;
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.json' ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg')
  );
};

const isNavigation = (url) => {
  const pathname = new URL(url).pathname;
  return (
    !pathname.startsWith('/_next/') &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/icons/') &&
    !pathname.includes('.')
  );
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  if (request.method !== 'GET') return;

  if (url.includes('/api/')) {
    event.respondWith(networkFirstWithCache(request, NAV_CACHE));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isNavigation(url)) {
    event.respondWith(networkFirstWithCache(request, NAV_CACHE));
    return;
  }

  event.respondWith(networkFirstWithCache(request, NAV_CACHE));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const nextUrl = request.url.replace('http://', 'https://');
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const cachedRoot = await caches.match('/');
      if (cachedRoot) return cachedRoot;
    }
    return new Response(
      JSON.stringify({ success: false, message: 'You are offline. Some features may be unavailable.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const isCritical = data.data?.severity === 'critical';
    const options = {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: isCritical ? [500, 100, 300, 100, 500] : [200, 100, 200],
      tag: data.data?.type || 'default',
      renotify: true,
      requireInteraction: isCritical,
      silent: false,
      data: { url: data.data?.url || '/', type: data.data?.type, id: data.data?.alertId || data.data?.paymentId },
    };
    if (data.image) options.image = data.image;
    event.waitUntil(
      self.registration.showNotification(data.title || 'VisionGate', options)
    );
  } catch {
    const text = event.data.text();
    if (text) {
      event.waitUntil(
        self.registration.showNotification('VisionGate', { body: text, icon: '/icons/icon-192x192.png', badge: '/icons/icon-96x96.png' })
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
