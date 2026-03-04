const CACHE = "fitness-cache-v1";

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => {
            return cache.addAll([
                "/",
                "/index.html",
                "/app.js",
                "/style.css"
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