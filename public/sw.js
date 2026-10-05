// Service Worker for Fleet360 PWA / APK
const CACHE_NAME = 'fleet360-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // تمرير الطلبات للشبكة بسلاسة لدعم قاعدة البيانات اللحظية
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
