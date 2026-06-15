// ClawNote service worker — v2 (kill-switch + network-first).
// v1 cached static assets cache-first, which served stale dev chunks. v2:
// 1) on activate, wipe ALL old caches and take over every client immediately;
// 2) network-first for everything (offline falls back to cache), so users
//    always see the latest code when online.
const CACHE = "clawnote-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/clawnote", "/manifest.webmanifest", "/icon.svg"])).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return; // never touch API responses

  // Network-first: fresh when online, cached fallback when offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && request.mode === "navigate") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match("/clawnote"))),
  );
});
