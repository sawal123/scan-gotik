self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Minimal fetch listener to satisfy PWA requirements
  e.respondWith(
    fetch(e.request).catch(() => new Response("Network error/Offline", { status: 503 }))
  );
});
