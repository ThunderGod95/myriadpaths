{{- $styles := resources.Get "css/common.css" | minify | fingerprint -}}
{{- $highlights := resources.Get "css/highlights.css" | minify | fingerprint -}}
{{- $chapterCss := resources.Get "css/chapter.css" | minify | fingerprint -}}
{{- $indexCss := resources.Get "css/index.css" | minify | fingerprint -}}
{{- $floatingCore := resources.Get "js/vendor/floating-ui/core.js" | minify | fingerprint -}}
{{- $floatingDom := resources.Get "js/vendor/floating-ui/dom.js" | minify | fingerprint -}}
{{- $chapterJs := resources.Get "js/chapter.js" | minify | fingerprint -}}
{{- $indexJs := resources.Get "js/index.js" | minify | fingerprint -}}
{{- $highlightJs := resources.Get "js/highlight.js" | minify | fingerprint -}}
{{- $audioJs := resources.Get "js/audio.js" | minify | fingerprint -}}

{{- $assetsToHash := slice
    $styles.Data.Integrity
    $highlights.Data.Integrity
    $chapterCss.Data.Integrity
    $indexCss.Data.Integrity
    $floatingCore.Data.Integrity
    $floatingDom.Data.Integrity
    $chapterJs.Data.Integrity
    $indexJs.Data.Integrity
    $highlightJs.Data.Integrity
    $audioJs.Data.Integrity
-}}

{{- $swVersion := delimit $assetsToHash "" | md5 -}}

const CACHE_NAME = "myriadpaths-cache-{{ $swVersion }}";

const ASSETS = [
    '{{- "" | relURL -}}',
    '{{- "index.html" | relURL -}}',
    '{{- "offline.html" | relURL -}}',
    '{{- "chapters.json" | relURL -}}',

    '{{- $styles.RelPermalink -}}',
    '{{- $highlights.RelPermalink -}}',
    '{{- $chapterCss.RelPermalink -}}',
    '{{- $indexCss.RelPermalink -}}',
    '{{- $chapterJs.RelPermalink -}}',
    '{{- $indexJs.RelPermalink -}}',
    '{{- $highlightJs.RelPermalink -}}',
    '{{- $audioJs.RelPermalink -}}',
    '{{- $floatingCore.RelPermalink -}}',
    '{{- $floatingDom.RelPermalink -}}',

    '{{- "img/cover.webp" | relURL -}}',
    '{{- "icons/favicon-96x96.png" | relURL -}}',
    '{{- "icons/favicon.svg" | relURL -}}'
];

const OFFLINE_URL = '{{ "offline.html" | relURL }}';

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
                return Promise.all(
                    ASSETS.map(url => {
                        return cache.add(url).catch(error => {
                            console.error('Could not cache:', url, error);
                        });
                    })
                );
            })
        );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const requestUrl = new URL(event.request.url);

    if (
        requestUrl.origin.includes("fonts.googleapis.com") ||
        requestUrl.origin.includes("fonts.gstatic.com")
    ) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return (
                    cached ||
                    fetch(event.request).then((networkResponse) => {
                        if (networkResponse.ok) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return networkResponse;
                    })
                );
            })
        );
        return;
    }

    if (requestUrl.pathname.endsWith("chapters.json")) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(event.request, {
                        ignoreSearch: true,
                        ignoreVary: true,
                    });
                })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request)
                .then((networkResponse) => {
                    if (
                        networkResponse &&
                        networkResponse.status === 200 &&
                        (networkResponse.type === "basic" ||
                            networkResponse.type === "cors")
                    ) {
                        const responseToCache = networkResponse.clone();
                        if (!event.request.url.startsWith("http")) {
                            return networkResponse;
                        }

                        if (responseToCache.redirected) {
                            responseToCache.blob().then((bodyBlob) => {
                                const cleanResponse = new Response(bodyBlob, {
                                    status: responseToCache.status,
                                    statusText: responseToCache.statusText,
                                    headers: responseToCache.headers,
                                });
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(event.request, cleanResponse);
                                });
                            });
                        } else {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                    }
                    return networkResponse;
                })
                .catch((error) => {
                    // FALLBACK: Offline Page
                    if (
                        event.request.mode === "navigate" ||
                        event.request.destination === "document"
                    ) {
                        return caches.match(OFFLINE_URL);
                    }
                });

            return cachedResponse || fetchPromise;
        })
    );
});
