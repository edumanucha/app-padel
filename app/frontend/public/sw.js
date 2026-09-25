// Service worker mínimo (2026-09-13, PWA -- "modo sin conexión", alcance
// chico y a propósito: NO cachea pantallas ni datos reales, solo evita
// que el navegador muestre su propio error feo ("No hay conexión a
// Internet") cuando alguien navega sin señal -- en su lugar, muestra la
// pantalla propia /offline. El resto de la app sigue necesitando
// conexión real (Supabase), como siempre.
const CACHE_OFFLINE = "padelito-offline-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_OFFLINE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Solo intercepta navegaciones (cargar una pantalla completa) -- no
// pisa los pedidos a Supabase ni a los assets, que siguen yendo directo
// a la red como siempre.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});
