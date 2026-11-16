// Biketenance · service worker (el "mozo de almacén" de la app instalada)
// Va en: GitHub, repositorio biketenance, archivo sw.js
//
// Qué hace:
//  - Guarda una copia de las pantallas (index.html, manifiesto e iconos) para que la app abra aunque no haya cobertura.
//  - Siempre intenta primero traer la versión nueva de internet; la copia solo se usa si no hay red.
//  - NO toca las llamadas a la puerta de Apps Script ni nada de fuera de GitHub: los datos van siempre frescos a la hoja.
//
// Si cambias este archivo, sube el número de CACHE para que los móviles tiren la copia vieja.

var CACHE = 'biketenance-v1';
var ARCHIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './icon-maskable-192.png', './icon-maskable-512.png'];

// Al instalarse: guarda la copia de las pantallas
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});

// Al activarse: tira las copias de versiones anteriores
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nombres) {
    return Promise.all(nombres.filter(function (n) { return n.indexOf('biketenance-') === 0 && n !== CACHE; })
      .map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

// Cada vez que la app pide algo
self.addEventListener('fetch', function (e) {
  var req = e.request;
  // Solo lo nuestro y solo lecturas. La puerta (POST a script.google.com), las fuentes, etc.: pasan sin tocar.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function (resp) {
      // Hay red: se usa lo nuevo y se refresca la copia
      if (resp && resp.ok) {
        var copia = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia); });
      }
      return resp;
    }).catch(function () {
      // Sin red: se tira de la copia (y, si es abrir la app, de la pantalla principal)
      return caches.match(req, { ignoreSearch: true }).then(function (r) {
        return r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
      });
    })
  );
});
