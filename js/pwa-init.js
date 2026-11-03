// js/pwa-init.js
// Registrasi Service Worker + tombol "Install Aplikasi" (Android/Chrome)
// Untuk iOS Safari tidak ada prompt otomatis, jadi kita tampilkan instruksi manual.

(function () {
  // 1. Daftarkan service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function (err) {
        console.warn("Service worker gagal didaftarkan:", err);
      });
    });
  }

  // 2. Tangkap event install (khusus Android/Chrome/Edge)
  let deferredPrompt = null;

  function buatTombolInstall() {
    if (document.getElementById("pwaInstallBtn")) return;

    const btn = document.createElement("button");
    btn.id = "pwaInstallBtn";
    btn.innerHTML = '<i class="fas fa-mobile-alt me-2"></i>Install Aplikasi';
    btn.style.cssText = [
      "position:fixed",
      "bottom:20px",
      "right:20px",
      "z-index:1080",
      "background:#3b82f6",
      "color:#fff",
      "border:none",
      "border-radius:50px",
      "padding:12px 20px",
      "font-size:0.9rem",
      "font-weight:600",
      "box-shadow:0 6px 20px rgba(59,130,246,0.4)",
      "display:flex",
      "align-items:center",
      "cursor:pointer"
    ].join(";");

    btn.addEventListener("click", async function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        btn.remove();
      } else {
        tampilkanInstruksiIOS();
      }
    });

    document.body.appendChild(btn);
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    buatTombolInstall();
  });

  // Sudah ter-install? sembunyikan tombol
  window.addEventListener("appinstalled", function () {
    const btn = document.getElementById("pwaInstallBtn");
    if (btn) btn.remove();
    deferredPrompt = null;
  });

  // 3. Deteksi iOS Safari (tidak ada beforeinstallprompt), tampilkan tombol dengan instruksi manual
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function tampilkanInstruksiIOS() {
    alert(
      "Cara install di iPhone/iPad:\n\n" +
      "1. Ketuk tombol Share/Bagikan (ikon kotak dengan panah ke atas) di Safari\n" +
      "2. Pilih 'Add to Home Screen' / 'Tambah ke Layar Utama'\n" +
      "3. Ketuk 'Add' / 'Tambah'\n\n" +
      "Aplikasi akan muncul seperti app biasa di layar utama."
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (isIOS() && !isStandalone()) {
      buatTombolInstall();
    }
  });
})();
