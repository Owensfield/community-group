const CACHE_NAME = 'owensfield-cache-v3';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/s3.css',
  '/css/modern.css',
  '/js/main.js',
  '/offline.html',  // 👈 add offline fallback
];

function isImageRequest(request) {
  return request.url.match(/\.(png|jpg|jpeg|svg|webp|gif)(\?.*)?$/i);
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      }

      return fetch(event.request).then(function (networkResponse) {
        if (isImageRequest(event.request)) {
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(function () {
        // If offline — return fallback for HTML pages
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

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
