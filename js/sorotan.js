/* Sorotan di beranda: pengumuman / acara / berita pilihan admin.
   Data: Firestore pengurus/sorotan  { aktif, items:[{label, judul, deskripsi, tanggal, foto, tautan, teksTombol}] }
   Dipakai beranda (index.html) dan halaman admin (admin-sorotan.html). */
(function () {
  var MAKS = 6;
  var LABEL = ['Pengumuman', 'Acara', 'Info', 'Ibadah', 'Terbaru', 'Penting', 'Doakan'];
  var WARNA = [['#2563eb', '#60a5fa'], ['#7c3aed', '#a78bfa'], ['#0d9488', '#2dd4bf'], ['#ea580c', '#fb923c'], ['#db2777', '#f472b6'], ['#16a34a', '#4ade80']];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function foto(u, w) { return (u && u.indexOf('res.cloudinary.com') > -1 && u.indexOf('/upload/') > -1 && !/\/upload\/[a-z]_/.test(u)) ? u.replace('/upload/', '/upload/f_auto,q_auto,c_limit,w_' + w + '/') : u; }
  // hanya tautan aman: http(s) atau halaman di situs ini (bukan javascript:, data:, dll.)
  function tautanAman(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (/^[\w\-./]+\.html?(#[\w-]*)?(\?[\w=&%\-.]*)?$/i.test(u) || /^#[\w-]+$/.test(u)) return u;
    return '';
  }
  function bersih(d) {
    d = d || {};
    var items = Array.isArray(d.items) ? d.items : [];
    return {
      aktif: d.aktif !== false,
      items: items.filter(function (x) { return x && String(x.judul || '').trim(); }).slice(0, MAKS).map(function (x) {
        return { label: String(x.label || '').trim().slice(0, 20), judul: String(x.judul).trim().slice(0, 70), deskripsi: String(x.deskripsi || '').trim().slice(0, 200),
          tanggal: String(x.tanggal || '').trim().slice(0, 30), foto: String(x.foto || ''), tautan: tautanAman(x.tautan), teksTombol: String(x.teksTombol || '').trim().slice(0, 24) };
      })
    };
  }

  function kartu(k, i, total) {
    var w = WARNA[i % WARNA.length];
    var besar = i === 0 && total >= 3;
    var gbr = k.foto
      ? '<div class="sr-photo ph"><img class="ph-bd" src="' + esc(foto(k.foto, besar ? 900 : 600)) + '" alt="" aria-hidden="true" loading="lazy" onerror="this.remove()"><img class="ph-main" src="' + esc(foto(k.foto, besar ? 900 : 600)) + '" alt="' + esc(k.judul) + '" loading="lazy"></div>'
      : '<div class="sr-photo sr-nophoto"><i class="fas fa-star"></i></div>';
    var tombol = k.tautan
      ? '<a class="sr-btn" href="' + esc(k.tautan) + '"' + (/^https?:/i.test(k.tautan) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(k.teksTombol || 'Selengkapnya') + ' <i class="fas fa-arrow-right"></i></a>' : '';
    return '<article class="sr-card' + (besar ? ' sr-big' : '') + '" style="--c1:' + w[0] + ';--c2:' + w[1] + ';animation-delay:' + (i * 80) + 'ms">' + gbr +
      '<div class="sr-body">' +
        '<div class="sr-top">' + (k.label ? '<span class="sr-chip">' + esc(k.label) + '</span>' : '') + (k.tanggal ? '<span class="sr-date"><i class="far fa-calendar"></i>' + esc(k.tanggal) + '</span>' : '') + '</div>' +
        '<h3>' + esc(k.judul) + '</h3>' + (k.deskripsi ? '<p>' + esc(k.deskripsi) + '</p>' : '') + tombol +
      '</div></article>';
  }
  function tampil(c, secId, listId) {
    var sec = document.getElementById(secId || 'sorotan'), list = document.getElementById(listId || 'sorotanList');
    if (!sec || !list) return;
    if (!c.aktif || !c.items.length) { sec.style.display = 'none'; return; }
    sec.style.display = '';
    list.className = 'sr-list n' + Math.min(c.items.length, 4);
    list.innerHTML = c.items.map(function (k, i) { return kartu(k, i, c.items.length); }).join('');
  }
  function muat(db) {
    return Promise.resolve().then(function () { return db.collection('pengurus').doc('sorotan').get(); })
      .then(function (s) { return bersih(s.exists ? s.data() : {}); })
      .catch(function (e) { console.warn('Sorotan tidak dimuat:', e && e.message); return bersih({}); });
  }
  window.SOROTAN = { MAKS: MAKS, LABEL: LABEL, WARNA: WARNA, bersih: bersih, tautanAman: tautanAman, muat: muat, tampil: tampil, foto: foto };
})();
