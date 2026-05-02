// BuildFi Planner — Service Worker (Offline-first, v13)
//
// Cache name is bumped whenever the shipped planner code changes so that
// previously cached assets are evicted on activate. Bump VERSION below when
// shipping a new build. Bumped 2026-05-01 with the v2 → v3 rename so any
// previously-cached v2 asset list is invalidated cleanly.
var VERSION = 'v13.0.0-2026-05-01';
var CACHE_NAME = 'buildfi-planner-' + VERSION;

// Core assets to pre-cache. Primary planner is planner_v3.html (v2 retired
// 2026-05-01). Keep this list in sync with real filenames or install will
// fail silently for missing ones.
var ASSETS = [
  './',
  './planner_v3.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      // Signal all open clients that a new version is active so the page can
      // surface a "reload for latest version" prompt instead of silently
      // serving a mix of old and new assets across navigations.
      return self.clients.matchAll({ includeUncontrolled: true }).then(function(cs) {
        cs.forEach(function(c) { c.postMessage({ type: 'sw-activated', version: VERSION }); });
      });
    })
  );
});

// Allow clients to force-activate a waiting SW (for explicit user-triggered updates).
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // CDN resources (React, fonts, xlsx): network-first with cache fallback
  if (url.hostname !== location.hostname) {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return resp;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // App assets: cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return resp;
      });
    })
  );
});
