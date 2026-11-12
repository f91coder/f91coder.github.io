// Service worker do site institucional (registrado por js/script.js com escopo "/").
// So cuida dos arquivos listados abaixo: busca sempre a versao publicada e usa o cache apenas offline.
// Todo o resto do dominio (apps, APIs, landings: /quosheets, /fpv, /emaper, /ttreino, /php/...) vai direto
// para a rede. A versao v3 guardava qualquer GET para sempre (inclusive respostas de API e paginas antigas);
// trocar o nome do cache apaga essas copias no navegador de quem ja tinha o site salvo.
const CACHE_NAME = 'f91-static-v4';
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
  './js/manifest.json?v=20260915',
  './img/favicon.png?v=20260910',
  './img/logo.png?v=20260910',
  './img/logo_.png?v=20260910',
  './img/icon-192.png?v=20260910',
  './img/icon-512.png?v=20260910',
  './img/icon-android.png?v=20260915',
  './img/icon-android-192.png?v=20260915',
  './img/icon-android-512.png?v=20260915'
];
const SITE_FILES = new Set(PRECACHE_URLS.map((path) => {
  const url = new URL(path, self.location.href);
  return url.pathname + url.search;
}));

function deleteOldCaches() {
  return caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(deleteOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  // Na troca de versao o service worker anterior ainda termina alguns downloads e pode recriar o cache
  // antigo depois do "activate"; por isso a limpeza se repete a cada pagina aberta.
  if (request.mode === 'navigate') {
    event.waitUntil(deleteOldCaches());
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !SITE_FILES.has(url.pathname + url.search)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.open(CACHE_NAME).then((cache) => cache.match(request).then((cached) => cached || cache.match('./index.html'))))
  );
});
