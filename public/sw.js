// Keeps the app working without internet after the first visit.
// The page itself is fetched from the network first, so new versions show up;
// the files in assets/ have a content hash in their name and never change, so the saved copy is used.
const CACHE = 'teclado-v1';
const STATIC = ['./manifest.webmanifest', './icon-192.png', './icon-512.png'];

async function precache() {
  const cache = await caches.open(CACHE);
  const res = await fetch('./', { cache: 'no-cache' });
  const html = await res.clone().text();
  await cache.put('./', res);
  const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll([...assets, ...STATIC]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
