const CACHE_NAME = 'owensfield-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/s3.css',
  '/css/modern.css',
  '/js/main.js',
  '/images/android-launchericon-512-512.png',
  '/images/android-launchericon-192-192.png',
  '/images/android-launchericon-144-144.png',
  '/images/android-launchericon-96-96.png',
  '/images/android-launchericon-72-72.png',
  '/images/android-launchericon-48-48.png',
  // add other static assets (logo, hero images, etc)
];

// Install the service worker
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Intercept requests
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        // Cache hit — return the cached response
        if (response) {
          return response;
        }
        // Otherwise, fetch from network
        return fetch(event.request);
      })
  );
});

// Update service worker — clean up old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
