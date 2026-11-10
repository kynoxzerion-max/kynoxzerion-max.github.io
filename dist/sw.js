const CACHE_NAME = "nexus-shell-v3";
const SHELL_URLS = ["/", "/manifest.webmanifest", "/nexus-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("nexus-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith("/api/") || pathname === "/calls" || pathname.startsWith("/api/creator-league/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            await caches.open(CACHE_NAME).then((cache) => cache.put("/", response.clone()));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ?? (await caches.match("/")) ?? Response.error();
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then(async (response) => {
        if (response.ok && response.type === "basic") {
          await caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      });
    }),
  );
});
