/* ================================================================
   sw.js — v10.2 離線快取
   發布新版或替換圖示後，請增加 CACHE_VERSION。
   ================================================================ */
const CACHE_VERSION = 'homestay-v11-0-0';

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
  "./js/shared-cloud.js",
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
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(
        cached => cached || caches.match('./index.html')
      ))
  );
});
