/* ================================================================
   sw.js — v10.4.1 離線快取
   發布新版或替換圖示後，請增加 CACHE_VERSION。
   ================================================================ */
const CACHE_VERSION = 'homestay-v10-4-2';
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./css/00-tokens.css",
  "./css/01-base.css",
  "./css/02-layout.css",
  "./css/03-components.css",
  "./css/04-dashboard.css",
  "./css/05-forms-lists.css",
  "./css/06-housekeeping.css",
  "./css/07-inventory.css",
  "./css/08-settings.css",
  "./css/09-responsive.css",
  "./icons/brand.svg",
  "./icons/account.svg",
  "./icons/nav-home.svg",
  "./icons/nav-bookings.svg",
  "./icons/nav-housekeeping.svg",
  "./icons/nav-inventory.svg",
  "./icons/nav-settings.svg",
  "./icons/module-checkin.svg",
  "./icons/module-checkout.svg",
  "./icons/module-housekeeping.svg",
  "./icons/module-finance.svg",
  "./icons/alert-clock.svg",
  "./icons/alert-inventory.svg",
  "./icons/alert-maintenance.svg",
  "./icons/alert-ok.svg",
  "./icons/settings-basic.svg",
  "./icons/settings-account.svg",
  "./icons/settings-areas.svg",
  "./icons/settings-maintenance.svg",
  "./icons/settings-finance.svg",
  "./icons/settings-reports.svg",
  "./icons/settings-google.svg",
  "./js/core.js",
  "./js/dashboard.js",
  "./js/bookings.js",
  "./js/housekeeping.js",
  "./js/inventory.js",
  "./js/maintenance.js",
  "./js/finance.js",
  "./js/reports.js",
  "./js/google.js",
  "./js/settings.js",
  "./js/app.js"
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 頁面導覽：網路優先，離線時才回首頁。
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (
          await caches.match(request)
          || await caches.match('./index.html')
          || Response.error()
        ))
    );
    return;
  }

  // 同源靜態資源：快取優先，背景更新；不再用 index.html 冒充 JS、JSON 或圖片。
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || Response.error());

      return cached || network;
    })
  );
});
