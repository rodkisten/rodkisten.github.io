/* Photo Manager 4.8.0 · offline shell cache, no personal media storage */
const VERSION = "4.8.0";
const SCOPE = new URL(self.registration.scope);
const PREFIX = "photo-manager-ui:" + encodeURIComponent(SCOPE.pathname) + ":";
const SHELL_CACHE = PREFIX + "shell-" + VERSION;
const VENDOR_CACHE = PREFIX + "vendor-" + VERSION;
const PRE_CACHE = [
  "./", "./index.html", "./assets/ui.css", "./assets/ui.js",
  "./assets/app.js", "./assets/boot.js", "./assets/vue.global.prod.js", "./manifest.webmanifest",
  "./assets/icons/icon-180.png", "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];
const SHELL_PATHS = new Set(PRE_CACHE.map(path => new URL(path, SCOPE).pathname));
const VENDOR_PATH = "/vue-router@4.6.3/dist/vue-router.global.prod.js";
const VENDORS = [
  "https://cdn.jsdelivr.net/npm/vue-router@4.6.3/dist/vue-router.global.prod.js",
  "https://unpkg.com/vue-router@4.6.3/dist/vue-router.global.prod.js",
];
const VENDOR_HOSTS = new Set(["cdn.jsdelivr.net", "unpkg.com"]);

async function cacheVendors() {
  const cache = await caches.open(VENDOR_CACHE);
  // These requests can be opaque. Store only the pinned library, never any API data.
  await Promise.allSettled(VENDORS.map(async url => {
    const request = new Request(url, { mode: "no-cors", credentials: "omit" });
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") await cache.put(request, response);
  }));
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(PRE_CACHE);
    await cacheVendors();
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) &&
      name !== SHELL_CACHE && name !== VENDOR_CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

function isAllowedVendor(url) {
  return url.protocol === "https:" && VENDOR_HOSTS.has(url.hostname) &&
    url.pathname.endsWith(VENDOR_PATH) && url.search === "";
}

// IMPORTANT: images are already deduplicated via Pyto's shared Preview Cache.
// The SW NEVER duplicates private thumbnails or stores authentication/API data.
function isPrivateMedia(url) {
  return /\/(?:api|media-preview|quality-preview|duplicates-preview|search-preview|face-preview|current-preview|preview|search-export)(?:\/|$)/.test(url.pathname)
    || url.searchParams.has("ticket") || url.searchParams.has("token");
}

async function offlineVendor(request) {
  const cache = await caches.open(VENDOR_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") await cache.put(request, response.clone());
  return response;
}

async function navigationResponse(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const live = await fetch(request);
    if (live.ok) await cache.put("./index.html", live.clone());
    return live;
  } catch {
    return (await cache.match("./index.html")) || Response.error();
  }
}

async function staticResponse(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (isPrivateMedia(url)) return;
  if (isAllowedVendor(url)) {
    event.respondWith(offlineVendor(request));
    return;
  }
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  if (request.mode === "navigate") {
    if (url.pathname === SCOPE.pathname || url.pathname === new URL("./index.html", SCOPE).pathname) {
      event.respondWith(navigationResponse(request));
    }
    return;
  }
  // Only the pinned UI shell is eligible for caching. Never cache other paths,
  // even when a future backend adds a new personal-media endpoint.
  if (!SHELL_PATHS.has(url.pathname) || url.search) return;
  event.respondWith(staticResponse(request));
});
