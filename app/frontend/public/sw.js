// Service worker de Padelito.
//
// v1 (2026-09-13): solo mostraba la pantalla propia /offline sin señal.
// v2 (2026-09-30, Marcadorcito sin internet): guarda las pantallas y los
// archivos de la app en el celu para que el Marcadorcito abra y funcione
// sin señal:
//  - Pantallas (navegación): primero la red; si no hay, la copia guardada.
//    Todas las /partido/<id>/marcador comparten UNA copia (la pantalla es
//    la misma, el id lo lee el cliente desde la URL -- MarcadorPorUrl.js).
//  - Archivos de /_next/static (JS, CSS, letras): tienen el hash en el
//    nombre, nunca cambian -> primero la copia guardada.
//  - Supabase (otro dominio) y /api: NO se tocan, siempre van a la red.
const VERSION = "v2";
const CACHE_PANTALLAS = `padelito-pantallas-${VERSION}`;
const CACHE_ESTATICOS = `padelito-estaticos-${VERSION}`;
const OFFLINE_URL = "/offline";
const CLAVE_MARCADOR = "/partido/_/marcador";
const PRECARGAR = ["/", "/marcador-libre", CLAVE_MARCADOR, OFFLINE_URL];
// Audios en silencio del modo ⌚ Reloj (tienen que estar para jugar sin señal).
const SONIDOS = ["/sonidos/silencio.wav", "/sonidos/silencio2.wav"];

// Baja una pantalla, la guarda y guarda también los JS/CSS que usa.
async function precargar(url) {
  const pantallas = await caches.open(CACHE_PANTALLAS);
  const estaticos = await caches.open(CACHE_ESTATICOS);
  const resp = await fetch(url, { credentials: "same-origin" });
  // Una respuesta que vino de una redirección no sirve para navegar.
  if (!resp.ok || resp.redirected) return;
  await pantallas.put(url, resp.clone());
  const html = await resp.text();
  const archivos = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
  await Promise.all(
    archivos.map((a) =>
      estaticos.match(a).then((ya) => (ya ? null : estaticos.add(a).catch(() => null)))
    )
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      ...PRECARGAR.map((u) => precargar(u).catch(() => null)),
      caches.open(CACHE_ESTATICOS).then((c) => c.addAll(SONIDOS)).catch(() => null),
    ])
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves
            .filter((c) => c.startsWith("padelito-") && c !== CACHE_PANTALLAS && c !== CACHE_ESTATICOS)
            .map((c) => caches.delete(c))
        )
      )
      .then(() => self.clients.claim())
  );
});

function claveDePantalla(url) {
  return /^\/partido\/[^/]+\/marcador\/?$/.test(url.pathname) ? CLAVE_MARCADOR : url.pathname;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  // Audio pide por partes (Range): los sonidos se sirven enteros desde la
  // copia guardada (el navegador acepta la respuesta completa); el resto
  // va directo a la red.
  if (req.headers.has("range")) {
    if (SONIDOS.includes(url.pathname)) {
      event.respondWith(caches.match(url.pathname).then((r) => r ?? fetch(req)));
    }
    return;
  }

  if (req.mode === "navigate") {
    const clave = claveDePantalla(url);
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok && !resp.redirected) {
            const copia = resp.clone();
            caches.open(CACHE_PANTALLAS).then((c) => c.put(clave, copia));
          }
          return resp;
        })
        .catch(async () => {
          const c = await caches.open(CACHE_PANTALLAS);
          return (await c.match(clave)) ?? (await c.match(OFFLINE_URL)) ?? Response.error();
        })
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_ESTATICOS).then(async (c) => {
        const guardado = await c.match(req);
        if (guardado) return guardado;
        const resp = await fetch(req);
        if (resp.ok) c.put(req, resp.clone());
        return resp;
      })
    );
    return;
  }

  // Íconos, manifest, sonidos: primero la red, si no hay, la copia.
  if (!url.searchParams.has("_rsc") && !req.headers.get("RSC")) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok && resp.type === "basic") {
            const copia = resp.clone();
            caches.open(CACHE_ESTATICOS).then((c) => c.put(req, copia));
          }
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r ?? Response.error()))
    );
  }
});
