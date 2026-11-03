/* Info kontak & balasan otomatis — dipakai beranda, footer halaman publik, dan admin-kontak.html.
   Data tersimpan di Firestore: pengurus/kontak (jika belum ada, dipakai nilai bawaan di bawah). */
(function () {
  var DEFAULT = {
    alamat: 'Jl. Pelikan 5 No. 2, Tegal Sari Mandala II, Kec. Medan Denai, Kota Medan, Sumatera Utara 20371',
    mapsUrl: 'https://maps.app.goo.gl/xH5D7FNRyEXDWFrF8',
    telepon: '0813-6085-6654',
    whatsapp: '0813-6085-6654',
    email: 'rnhkbppelikan@gmail.com',
    instagram: 'nhkbppelikanrealaccount',
    jamBuka: '08:00',
    jamTutup: '21:00',
    pesanAwal: '{sapaan} admin RNHKBP Pelikan 🙏\nSaya ingin bertanya.',
    balasan: '{sapaan}, {nama}! 🙏\nTerima kasih sudah menghubungi RNHKBP Pelikan. Pesanmu sudah diteruskan ke WhatsApp admin dan akan dibalas pada jam layanan ({jam}).\nTuhan memberkati.',
    balasanLuar: 'Saat ini admin sedang di luar jam layanan, jadi balasan mungkin agak lama. Terima kasih atas kesabarannya.',
    waSambutan: 'Halo! Terima kasih sudah menghubungi RNHKBP Pelikan 🙏\nAdmin akan membalas pada jam layanan ({jam}). Tuhan memberkati.',
    waAway: 'Terima kasih sudah menghubungi RNHKBP Pelikan 🙏\nSaat ini admin sedang di luar jam layanan ({jam}). Pesan Anda akan dibalas begitu admin kembali. Tuhan memberkati.'
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function waNomor(n) {
    var d = String(n || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.indexOf('62') === 0) return d;
    if (d.charAt(0) === '0') return '62' + d.slice(1);
    return '62' + d;
  }
  function gabung(d) {                       // nilai kosong -> pakai bawaan
    var out = {}, k;
    for (k in DEFAULT) out[k] = (d && typeof d[k] === 'string' && d[k].trim() !== '') ? d[k].trim() : DEFAULT[k];
    return out;
  }
  function menit(hhmm) { var p = String(hhmm).split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
  function jamTeks(d) { return String(d.jamBuka).replace(':', '.') + '–' + String(d.jamTutup).replace(':', '.') + ' WIB'; }
  function sekarangWIB() {
    var t = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour12: false, hour: '2-digit', minute: '2-digit' });
    return menit(t);
  }
  function dalamJam(d, now) {
    var n = now == null ? sekarangWIB() : now, a = menit(d.jamBuka), b = menit(d.jamTutup);
    return a <= b ? (n >= a && n < b) : (n >= a || n < b);   // mendukung jam layanan lewat tengah malam
  }
  function sapaan(date) {
    var h = (date || new Date()).getHours();
    return h >= 4 && h < 11 ? 'Selamat pagi' : h < 15 && h >= 11 ? 'Selamat siang' : h >= 15 && h < 18 ? 'Selamat sore' : 'Selamat malam';
  }
  function isi(tpl, vars) {
    return String(tpl || '').replace(/\{(sapaan|nama|jam)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; });
  }
  function waLink(d, teks) { return 'https://wa.me/' + waNomor(d.whatsapp) + (teks ? '?text=' + encodeURIComponent(teks) : ''); }
  function telLink(d) { var n = waNomor(d.telepon); return n ? 'tel:+' + n : '#'; }
  function igHandle(d) { return String(d.instagram).replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, ''); }
  function igUrl(d) { return /^https?:\/\//i.test(d.instagram) ? d.instagram : 'https://www.instagram.com/' + igHandle(d); }
  function alamatPendek(d) { return d.alamat.split(',').slice(0, 2).join(',').trim(); }

  // logo kecil (SVG sendiri, bukan berkas luar)
  var LOGO = {
    maps: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="#ea4335" d="M12 1.5C7.9 1.5 4.6 4.8 4.6 8.9c0 5.5 7.4 13.6 7.4 13.6s7.4-8.1 7.4-13.6c0-4.1-3.3-7.4-7.4-7.4z"/><circle cx="12" cy="8.9" r="3" fill="#fff"/></svg>',
    wa: '<i class="fab fa-whatsapp" style="color:#25d366;font-size:1.65rem"></i>',
    email: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="#ea4335"/><path d="M3.5 6.8l8.5 6.4 8.5-6.4" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tel: '<i class="fas fa-phone" style="color:#2563eb;font-size:1.3rem"></i>',
    ig: '<i class="fab fa-instagram" style="color:#e1306c;font-size:1.6rem"></i>'
  };

  // daftar item kontak (dipakai kartu "Hubungi Kami" dan pratinjau admin)
  function items(d) {
    return [
      { logo: LOGO.maps, label: 'Alamat', nilai: d.alamat, href: d.mapsUrl, aksi: 'Buka Maps', ext: true },
      { logo: LOGO.wa, label: 'WhatsApp', nilai: d.whatsapp, href: waLink(d, isi(d.pesanAwal, { sapaan: sapaan(), nama: '', jam: jamTeks(d) })), aksi: 'Chat', ext: true },
      { logo: LOGO.email, label: 'Email', nilai: d.email, href: 'mailto:' + d.email, aksi: 'Kirim email' },
      { logo: LOGO.tel, label: 'Telepon', nilai: d.telepon, href: telLink(d), aksi: 'Telepon' },
      { logo: LOGO.ig, label: 'Instagram', nilai: '@' + igHandle(d), href: igUrl(d), aksi: 'Buka', ext: true }
    ];
  }
  function itemsHTML(d) {
    return items(d).map(function (it) {
      return '<a class="kt-item" href="' + esc(it.href) + '"' + (it.ext ? ' target="_blank" rel="noopener"' : '') + ' title="' + esc(it.aksi) + '" aria-label="' + esc(it.aksi + ': ' + it.nilai) + '">' +
        '<span class="kt-logo">' + it.logo + '</span>' +
        '<span class="kt-text"><small>' + esc(it.label) + '</small><b>' + esc(it.nilai) + '</b></span>' +
        '<span class="kt-go" aria-hidden="true"><i class="fas fa-arrow-up-right-from-square"></i></span></a>';
    }).join('');
  }
  function jamHTML(d) {
    var buka = dalamJam(d);
    return '<span class="kt-dot ' + (buka ? 'on' : 'off') + '"></span>' + (buka ? 'Admin online' : 'Di luar jam layanan') + ' · ' + esc(jamTeks(d));
  }
  function footerHTML(d) {
    return '<li><i class="fas fa-map-marker-alt" style="color:#ea4335"></i> <a href="' + esc(d.mapsUrl) + '" target="_blank" rel="noopener">' + esc(alamatPendek(d)) + '</a></li>' +
      '<li><i class="fab fa-whatsapp" style="color:#25d366"></i> <a href="' + esc(waLink(d)) + '" target="_blank" rel="noopener">' + esc(d.whatsapp) + '</a></li>' +
      (waNomor(d.telepon) !== waNomor(d.whatsapp) ? '<li><i class="fas fa-phone" style="color:#7aa2ff"></i> <a href="' + esc(telLink(d)) + '">' + esc(d.telepon) + '</a></li>' : '') +
      '<li><i class="fas fa-envelope" style="color:#f87171"></i> <a href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a></li>' +
      '<li><i class="fab fa-instagram" style="color:#f472b6"></i> <a href="' + esc(igUrl(d)) + '" target="_blank" rel="noopener">@' + esc(igHandle(d)) + '</a></li>';
  }
  function muat(db) {
    return Promise.resolve().then(function () { return db.collection('pengurus').doc('kontak').get(); })
      .then(function (s) { return gabung(s.exists ? s.data() : {}); })
      .catch(function (e) { console.warn('Kontak memakai data bawaan:', e && e.message); return gabung({}); });
  }

  window.KONTAK_DEFAULT = DEFAULT;
  window.KONTAK = { gabung: gabung, muat: muat, waNomor: waNomor, waLink: waLink, telLink: telLink, igUrl: igUrl, igHandle: igHandle,
    jamTeks: jamTeks, dalamJam: dalamJam, sapaan: sapaan, isi: isi, items: items, itemsHTML: itemsHTML, jamHTML: jamHTML, footerHTML: footerHTML, esc: esc };
})();
