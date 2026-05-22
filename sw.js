// Service Worker — Route di Pentecoste v2
// Autore: Paolo Mirabelli — AGESCI Calabria PC
const CACHE = 'pentecoste-v2';
const TILES = 'osm-tiles-v2';

const SHELL = ['./', './index.html', './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k!==CACHE && k!==TILES).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // OSM tiles → cache first, then network (saves tiles for offline)
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(caches.open(TILES).then(c =>
      c.match(e.request).then(hit => {
        if (hit) return hit;
        return fetch(e.request).then(res => {
          if (res.ok) c.put(e.request, res.clone());
          return res;
        }).catch(() => new Response('', {status:503}));
      })
    ));
    return;
  }

  // OSRM route API → network first, no cache (always get fresh route if online)
  if (url.hostname.includes('router.project-osrm.org')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{}', {status:503})));
    return;
  }

  // CDN + app shell → cache first
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && (url.hostname.includes('cdnjs') || url.pathname.match(/\.(html|js|json|css)$/)))
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }))
  );
});
