const CACHE_NAME = "wake-stake-cache-v1";
const OFFLINE_URLS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const shouldBypass = request => {
  if (request.method !== "GET") return true;
  if (request.headers.get("upgrade") === "websocket") return true;
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/event-stream")) return true;

  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    // Allow Next.js internals and API routes to hit the network directly.
    if (url.pathname.startsWith("/_next/")) return true;
    if (url.pathname.startsWith("/api/")) return true;
    return false;
  }

  // Only cache map tiles; everything else should go to the network untouched.
  return !url.hostname.endsWith("tile.openstreetmap.org");
};

self.addEventListener("fetch", event => {
  const { request } = event;
  if (shouldBypass(request)) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") return cache.match("/");
        return Response.error();
      })
  );
});