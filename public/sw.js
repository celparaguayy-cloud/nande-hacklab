/**
 * Service worker de ÑANDE Hacklab.
 *
 * Cachea la app para que funcione sin conexión: una vez abierta, se puede
 * jugar offline. El mundo es todo local, así que nada necesita Internet.
 * Estrategia: red primero para navegación (para tomar versiones nuevas),
 * cache primero para el resto.
 */
const CACHE = "nande-hacklab-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./nande-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  // Documentos: red primero, cae al cache si no hay conexión.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("./index.html"))),
    );
    return;
  }

  // Recursos: cache primero, y si no está, red (y se guarda).
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached),
    ),
  );
});
