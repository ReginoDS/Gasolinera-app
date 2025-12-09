const CACHE_NAME = 'gasolineras-v1';
const STATIC_ASSETS = [
  '/Gasolinera-app/',
  '/Gasolinera-app/index.html',
  '/Gasolinera-app/manifest.webmanifest'
];

// Instalación: cachear assets estáticos
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cacheando assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés antiguos
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando caché antiguo', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: estrategia cache-first para assets, network-only para APIs
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Network-only para APIs externas (precios, rutas)
  if (url.hostname.includes('minetur.gob.es') || 
      url.hostname.includes('googleapis.com')) {
    return; // Dejar que pase directo a la red
  }
  
  // Cache-first para assets locales
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          // Cachear si es un recurso válido
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
      .catch(() => {
        // Fallback si está offline
        if (request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});
