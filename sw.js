const APP = "opener-v1", SHARED = "shared";
const CORE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(CORE)));
  self.skipWaiting();
});
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);

  // File shared from WhatsApp etc.
  if (req.method === "POST" && url.pathname.endsWith("/receive")) {
    e.respondWith((async () => {
      const data = await req.formData();
      const file = data.get("file");
      const cache = await caches.open(SHARED);
      await cache.put("shared-file", new Response(file, {
        headers: { "X-Name": encodeURIComponent(file.name), "Content-Type": file.type || "application/octet-stream" }
      }));
      return Response.redirect("./?shared=1", 303);
    })());
    return;
  }

  if (req.method !== "GET") return;
  // Cache-first, and remember CDN libraries after first use so it works offline
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(APP).then(c => c.put(req, copy)); }
    return res;
  })));
});
