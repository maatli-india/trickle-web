// Trickle service worker — makes the site an installable PWA with fast
// repeat loads and a friendly offline page.
//
// Deliberately conservative: pages and API responses carry a signed-in
// user's own data, and payments go through PayU, so neither is ever cached.
// Only content-hashed build assets and public static files are cached.
// Bump CACHE_VERSION whenever this file's caching rules change; old caches
// are dropped on activate.

const CACHE_VERSION = "v1";
const STATIC_CACHE = `trickle-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/offline.js", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith("trickle-") && key !== STATIC_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Never intercepted: anything carrying user data or money.
const isPrivate = (url) =>
  url.pathname.startsWith("/api/") || url.pathname.startsWith("/payment") || url.pathname.startsWith("/admin");

// Content-hashed by Next.js, so a cached copy is always the right copy.
const isImmutableAsset = (url) => url.pathname.startsWith("/_next/static/");

// Public files that may change between deploys — served from cache but
// refreshed in the background.
const isPublicFile = (url) => /\.(?:png|jpe?g|svg|webp|ico|woff2?)$/i.test(url.pathname) && !url.pathname.startsWith("/_next/image");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivate(url)) return;

  // Pages: always from the network (never cached), offline page as fallback.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  if (isPublicFile(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
