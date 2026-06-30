const CACHE_NAME = "lip-in-money-v8";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=8",
  "./src/main.js?v=8",
  "./src/config/app-config.js",
  "./src/core/selectors.js",
  "./src/core/store.js",
  "./src/core/transactions.js",
  "./src/data/categories.js",
  "./src/data/seed.js",
  "./src/features/actions.js",
  "./src/ui/charts.js",
  "./src/ui/components.js",
  "./src/ui/sheets.js",
  "./src/ui/views.js",
  "./src/utils/date.js",
  "./src/utils/download.js",
  "./src/utils/format.js",
  "./src/utils/html.js",
  "./manifest.webmanifest",
  "./assets/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(async (keys) => {
        const oldCaches = keys.filter((key) => key.startsWith("lip-in-money-") && key !== CACHE_NAME);
        await Promise.all(oldCaches.map((key) => caches.delete(key)));
        await self.clients.claim();

        if (!oldCaches.length) return;
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        await Promise.all(clients.map((client) => client.navigate(client.url)));
      })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "./index.html"));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request, fallbackUrl = null) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) return cache.match(fallbackUrl);
    throw new Error("Offline asset unavailable");
  }
}
