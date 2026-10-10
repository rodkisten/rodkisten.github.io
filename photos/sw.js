// Only the static UI shell lives on GitHub Pages; personal media stays in Pyto.
const CACHE_PREFIX = "photo-manager-shell:" +
  encodeURIComponent(new URL(self.registration.scope).pathname) + ":";
const CACHE = CACHE_PREFIX + "v4.7.0";
const SHELL = ["./", "./index.html", "./assets/ui.css", "./assets/ui.js",
  "./manifest.webmanifest", "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin ||
      !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (url.pathname.includes("/api/") || url.pathname.includes("-preview/") ||
      url.pathname.includes("/media-preview/") || url.pathname.includes("/search-export/")) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok) {
      const clone = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, clone)));
    }
    return response;
  }).catch(async () => (await caches.match(request)) || (await caches.match("./"))));
});
