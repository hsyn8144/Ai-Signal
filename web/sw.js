const CACHE_NAME = "futures-ai-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/orbit.js",
  "/js/chart.js",
  "/js/api.js",
  "/js/app.js",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("/api/")) {
    return; // Don't cache dynamic API requests
  }
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
