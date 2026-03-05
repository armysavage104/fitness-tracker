const CACHE = "fitness-cache-v2";

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => {
            return cache.addAll([
                "/",
                "/index.html",
                "/style.css",
                "/app.js",
                "/storage.js",
                "/manifest.json",
                "/icons/icon-192.png",
                "/icons/icon-512.png"
            ]);
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(res => {
            return res || fetch(event.request);
        })
    );
});