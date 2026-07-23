/* sw.js — service worker. Estrategia "network-first" para SIEMPRE mostrar
   la última versión cuando hay internet, y seguir funcionando offline. */
const CACHE = "finanzas-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/format.js",
  "./js/store.js",
  "./js/advisor.js",
  "./js/auth.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // recursos externos: passthrough

  // network-first: intenta la red (versión fresca), cae a caché si no hay señal
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("./index.html"))
      )
  );
});
