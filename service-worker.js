const CACHE = "fitness-cache-v3";

self.addEventListener("install", event => {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE).then(cache => {
            return cache.addAll([
                "/",
                "/index.html",
                "/style.css",
                "/app.js",
                "/storage.js",
                "/manifest.json"
            ]);
        })
    );
});

self.addEventListener("activate", event => {

    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE)
                    .map(key => caches.delete(key))
            );
        })
    );

    self.clients.claim();
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(res => {
            return res || fetch(event.request);
        })
    );
});