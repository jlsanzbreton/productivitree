
const CACHE_NAME = 'productivitree-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // '/index.tsx', // Usually not cached directly, but its output (main.js) is.
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Add placeholder sound/image assets if you have them locally
  // '/sounds/gentle_chime.mp3',
  // '/screenshots/screenshot1.png',
];

const cdnUrlsToCache = [
  'https://cdn.tailwindcss.com',
  'https://d3js.org/d3.v7.min.js',
  // Add esm.sh URLs if persistent caching is desired and reliable
  // "https://esm.sh/react@^19.1.0",
  // "https://esm.sh/react-dom@^19.1.0/client",
  // "https://esm.sh/@google/genai@^1.2.0",
];


self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        
        // Cache local assets
        const localAssetsPromise = cache.addAll(urlsToCache).catch(error => {
          console.error('Failed to cache local assets:', error);
          // Optionally, don't let this failure break the SW install
          return Promise.resolve(); 
        });

        // Cache CDN assets with CORS requests
        const cdnAssetPromises = cdnUrlsToCache.map(url => {
          const request = new Request(url, { mode: 'cors' });
          return fetch(request)
            .then(response => {
              if (response.ok) {
                return cache.put(request, response);
              }
              console.warn(`Failed to cache CDN asset (response not OK): ${url}`);
              return Promise.resolve();
            })
            .catch(error => {
              console.error(`Failed to fetch and cache CDN asset: ${url}`, error);
              return Promise.resolve();
            });
        });
        
        return Promise.all([localAssetsPromise, ...cdnAssetPromises]);
      })
      .catch(error => {
        console.error('Failed to cache resources during install phase:', error);
      })
  );
});

self.addEventListener('fetch', event => {
  // For navigation requests, always try network first, then fallback to cache (NetworkFirst)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If successful, cache the response for future offline use if it's a GET request
          if (response.ok && event.request.method === 'GET') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request)) // Fallback to cache if network fails
    );
    return;
  }

  // For other requests (assets), use CacheFirst strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache - fetch from network
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response to cache
            // Cache only GET requests and responses that are OK (status 200)
            // Also, be careful with opaque responses (type 'opaque') from no-cors requests if you re-enable them
            if (networkResponse && networkResponse.ok && event.request.method === 'GET') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
            console.error('Fetch failed for asset:', event.request.url, error);
            // Optionally, return a placeholder for images/assets if network fails
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
});

// Basic Push Notification listener (placeholder)
self.addEventListener('push', function(event) {
  const title = 'Productivitree Reminder';
  const options = {
    body: event.data ? event.data.text() : 'Time to check on your tree!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});