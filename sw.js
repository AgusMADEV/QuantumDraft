const CACHE_NAME = 'quantumdraft-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './physics.js',
  './manifest.json',
  './2YSd1EWPHixdwdA3.png',
  './qzTK0JomimK0KmZA.png',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.3.0/math.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/seedrandom/3.0.5/seedrandom.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // Limpiar caches antiguos
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedRes => cachedRes || fetch(event.request))
  );
});
