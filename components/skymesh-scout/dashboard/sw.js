/* AegisNet / SkyMesh Scout — Service Worker
   Prototype 4.2
   Strategy: cache-first for static assets, network-first for data endpoints.
   Offline fallback for the main app shell.
*/
const CACHE_NAME = "aegisnet-v4.4";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/setup-wizard.html",
  "/manifest.json",
  "/css/main.css",
  "/js/sources.js",
  "/js/mqtt.js",
  "/js/pages.js",
  "/js/field.js",
  "/js/app.js",
  "/js/comms-adapters.js",
  "/js/comms-router.js",
  "/js/tracking-adapters.js",
  "/js/tracking-router.js",
  "/js/webrtc.js",
  "/js/p4-pages.js",
  "/js/p4-app.js",
  "/js/node-identity.js",
  "/js/ais-hardware.js",
  "/js/test-mode.js",
  "/js/health-check.js",
  "/js/p4.2-pages.js",
  "/js/transport-adapters.js",
  "/js/network-settings.js",
  "/js/safety-education.js",
  "/js/p4.3-pages.js",
  "/js/sky-projector.js",
  "/js/node-registry.js",
  "/js/p4.4-pages.js"
];

// Data endpoints — always network-first, no cache
const DATA_PATHS = [
  "/data/aircraft.json",
  "/api/",
  "/config.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(
      STATIC_ASSETS.filter(u => !DATA_PATHS.some(d => u.startsWith(d)))
    )).catch(e => console.warn("[SW] Cache pre-load partial failure:", e))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Data/API endpoints: network-first, no fallback
  if (DATA_PATHS.some(d => url.pathname.startsWith(d))) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(
        JSON.stringify({ error: "offline", cached: false }),
        { headers: { "Content-Type": "application/json" } }
      ))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline fallback: serve app shell for navigation requests
        if (event.request.destination === "document") {
          return caches.match("/index.html");
        }
        return new Response("Offline", { status: 503 });
      });
    })
  );
});

// Handle notification clicks (placeholder — not yet sending notifications)
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
