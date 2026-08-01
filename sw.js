/**
 * Service Worker：離線快取。
 * 每次發布新版都要修改 CACHE 名稱。
 */

const CACHE="homestay-operation-v8-2-navigation-account-1";
const ASSETS=["./", "./index.html", "./styles.css", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./js/core.js", "./js/dashboard.js", "./js/bookings.js", "./js/housekeeping.js", "./js/inventory.js", "./js/maintenance.js", "./js/finance.js", "./js/analytics.js", "./js/settings.js", "./js/reports.js", "./js/google.js", "./js/app.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=> {
  if(e.request.method!=="GET")return;
  e.respondWith(fetch(e.request).then(r=> {
    let c=r.clone();
    caches.open(CACHE).then(x=>x.put(e.request,c));
    return r
  }).catch(()=>caches.match(e.request).then(x=>x||caches.match("./index.html"))))
});
