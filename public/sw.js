const CACHE_NAME = 'cta-tracker-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/styles/main.css',
  '/src/main.js',
  '/src/App.js',
  '/assets/fonts/SF-Pro-Display-Regular.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});