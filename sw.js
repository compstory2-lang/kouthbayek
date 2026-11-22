// خوذ بايك — Service Worker v1.5.6 (حماية المعطيات + مراسلة الإدارة + تخزين الردود السليمة فقط)
const CACHE_NAME = 'khouz-bayek-v1.5.3';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './data.js',
  './map.js',
  './privacy.js',
  './app.js',
  './privacy.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
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
// خوذ بايك — Service Worker v1.5.8 (حماية المعطيات + مراسلة الإدارة + تخزين الردود السليمة فقط)
const CACHE_NAME = 'khouz-bayek-v1.5.8';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './data.js',
  './map.js',
  './privacy.js',
  './app.js',
  './privacy.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
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
