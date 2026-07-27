// Service worker: los archivos que cambian seguido (la app y los precios)
// siempre intentan traer la versión más nueva primero, y solo usan lo
// guardado si no hay conexión. Los archivos que casi no cambian (íconos,
// manifest) se sirven directo desde el caché para que abra rápido.
var CACHE_NAME = "precios-ab-v2";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event){
  var url = event.request.url;
  var isPriceFile = url.indexOf("precios.csv") !== -1 || url.indexOf("precios.xlsx") !== -1;
  var isAppShell = event.request.mode === "navigate" ||
                    url.indexOf("index.html") !== -1 ||
                    url.indexOf("sw.js") !== -1;

  if (isPriceFile || isAppShell){
    // siempre intenta traer la versión más nueva primero;
    // si no hay conexión, usa la última copia guardada.
    event.respondWith(
      fetch(event.request).then(function(response){
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        return response;
      }).catch(function(){
        return caches.match(event.request).then(function(cached){
          return cached || caches.match("./index.html");
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached){
      if (cached) return cached;
      return fetch(event.request).then(function(response){
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        return response;
      }).catch(function(){
        return caches.match("./index.html");
      });
    })
  );
});
