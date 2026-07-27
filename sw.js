// Service worker de "solo caché": una vez que se visitó la app con conexión,
// queda guardada por completo en el celular y sigue funcionando sin internet
// ni wifi, aunque el celular se reinicie o pasen semanas.
var CACHE_NAME = "precios-ab-v1";
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
  var isPriceFile = event.request.url.indexOf("precios.csv") !== -1;

  if (isPriceFile){
    // precios.csv: siempre intenta traer la versión más nueva primero;
    // si no hay conexión, usa la última copia guardada.
    event.respondWith(
      fetch(event.request).then(function(response){
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        return response;
      }).catch(function(){
        return caches.match(event.request);
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
