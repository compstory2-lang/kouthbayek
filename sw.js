// خوذ بايك — Service Worker v1.5.28 (حماية المعطيات + مراسلة الإدارة + تخزين الردود السليمة فقط)
const CACHE_NAME = 'khouz-bayek-v1.5.28';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './data.js',
  './map.js',
  './privacy.js',
  './app.js',
  './admin.js',
  './privacy.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of CORE_ASSETS) {
        try {
          const resp = await fetch(asset, { cache: 'no-store' });
          if (resp && resp.ok) {
            await cache.put(asset, resp);
          }
        } catch (_) {}
      }
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.searchParams.has('code')) return; // عدم تخزين رابط عودة تسجيل الدخول بـ Google
  const isCore = url.origin === self.location.origin && (/\.(html|js|css)$/.test(url.pathname) || url.pathname.endsWith('/'));
  if (isCore) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
