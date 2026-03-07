const CACHE = "fitness-cache-v6";

self.addEventListener("install", event => {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE).then(cache => {
            return cache.addAll([
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

    // index.html всегда грузим с сервера
    if (event.request.mode === "navigate") {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then(res => {
            return res || fetch(event.request);
        })
    );
});