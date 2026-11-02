// service-worker.js
// Service Worker sederhana untuk RNHKBP Pelikan
// Membuat aplikasi bisa di-install (Android/iOS) & tetap bisa dibuka saat offline (halaman shell)

const CACHE_NAME = "rnhkbp-pelikan-v8";

// File inti yang di-cache agar aplikasi tetap bisa dibuka walau tanpa internet
const APP_SHELL = [
  "./",
  "./index.html",
  "./login.html",
  "./dashboard.html",
  "./app.html",
  "./absensi.html",
  "./anggota.html",
  "./partitur.html",
  "./dokumentasi-publik.html",
  "./style.css",
  "./css/admin.css",
  "./css/theme.css",
  "./css/publik.css",
  "./css/kegiatan.css",
  "./css/foto.css",
  "./css/pengurus.css",
  "./css/kontak.css",
  "./css/tema.css",
  "./css/pengaturan.css",
  "./js/pengaturan.js",
  "./js/kontak-data.js",
  "./js/pengurus-data.js",
  "./js/kegiatan-data.js",
  "./js/admin-common.js",
  "./logo.png",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.json"
];

// Install: simpan app shell ke cache
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // Kalau ada file yang gagal di-cache, jangan gagalkan seluruh install
        return Promise.resolve();
      });
    })
  );
});

// Activate: bersihkan cache versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: hanya tangani request GET dari domain sendiri (bukan Firebase/Firestore)
// Strategi: network-first, fallback ke cache kalau offline
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Jangan campuri request ke Firebase/Firestore/API eksternal — biarkan lewat apa adanya
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});
