const CACHE_NAME = 'f91-static-v2';
const PRECACHE_URLS = [
  './',
  './index.html',
  './blog.html',
  './css/swiper-bundle.min.css',
  './css/style.css',
  './css/responsive.css',
  './js/swiper-bundle.min.js',
  './js/script.js',
  './js/i18n.js',
  './js/btn-menu-mob.js',
  './js/manifest.json',
  './img/favicon.png?v=20260910',
  './img/logo.png?v=20260910',
  './img/logo_.png?v=20260910',
  './img/icon-192.png?v=20260910',
  './img/icon-512.png?v=20260910'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
