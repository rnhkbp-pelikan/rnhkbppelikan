/* Pengaturan tampilan situs: tema (Normal / Natal / Otomatis) + teks berjalan pengumuman.
   Data: Firestore pengurus/pengaturan. Hasil terakhir disimpan di browser agar tema langsung
   tampil tanpa berkedip pada kunjungan berikutnya. */
(function () {
  var KEY = 'pg_cfg_v1', HIDE = 'pg_tk_hide';
  var MANUAL = document.currentScript && document.currentScript.hasAttribute('data-manual');   // admin: tidak dipasang otomatis

  var DEFAULT = {
    tema: 'natal',
    salju: true,
    lampu: true,
    ucapan: 'Selamat Hari Natal & Tahun Baru',
    tickerAktif: true,
    tickerTeks: '🛠️ Website sedang diperbarui. Beberapa tampilan dan fitur mungkin berubah sementara. Terima kasih atas pengertiannya 🙏',
    tickerKecepatan: 'sedang',
    tickerBisaDitutup: true
  };

  function gabung(d) {
    var o = {}, k;
    for (k in DEFAULT) {
      var dv = DEFAULT[k], v = d && d[k];
      if (typeof dv === 'boolean') o[k] = typeof v === 'boolean' ? v : dv;
      else o[k] = (typeof v === 'string' && v.trim() !== '') ? v.trim() : dv;
    }
    if (['normal', 'natal', 'auto'].indexOf(o.tema) < 0) o.tema = 'natal';
    if (['lambat', 'sedang', 'cepat'].indexOf(o.tickerKecepatan) < 0) o.tickerKecepatan = 'sedang';
    return o;
  }
  function musimNatal(now) { var m = now.getMonth(), d = now.getDate(); return m === 11 || (m === 0 && d <= 6); }   // 1 Des - 6 Jan
  function natalAktif(c) { return c.tema === 'natal' || (c.tema === 'auto' && musimNatal(new Date())); }
  function hash(s) { var h = 0, i; for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); }
  function baca() { try { var r = localStorage.getItem(KEY); return r ? gabung(JSON.parse(r)) : null; } catch (e) { return null; } }
  function simpan(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }
  function disembunyikan(c) { try { return localStorage.getItem(HIDE) === hash(c.tickerTeks); } catch (e) { return false; } }
  function siap(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function hapus(sel) { Array.prototype.forEach.call(document.querySelectorAll(sel), function (n) { n.remove(); }); }

  /* ---------- teks berjalan ---------- */
  function span(t) { var s = document.createElement('span'); s.textContent = t; return s; }
  function bangunTicker(c, statik, natal) {
    var bar = document.createElement('div');
    bar.className = 'tk-bar' + (statik ? ' static' : '') + (natal ? ' t-natal' : '');
    if (!statik) bar.id = 'tkBar';
    bar.setAttribute('role', 'status');
    bar.innerHTML = '<span class="tk-badge">📢 Info</span>' +
      '<div class="tk-track"><div class="tk-move"></div></div>' +
      (c.tickerBisaDitutup ? '<button type="button" class="tk-x" aria-label="Sembunyikan pengumuman" title="Sembunyikan">✕</button>' : '');
    return bar;
  }
  function ukurTicker(bar, c) {      // panggil setelah bar masuk ke halaman
    var track = bar.querySelector('.tk-track'), move = bar.querySelector('.tk-move');
    if (!track || !move) return;
    move.innerHTML = ''; move.appendChild(span(c.tickerTeks));
    var w = move.firstChild.offsetWidth || 320, tw = track.clientWidth || 600;
    var k = Math.max(1, Math.ceil(tw / w)), g, i;
    move.innerHTML = '';
    for (g = 0; g < 2; g++) for (i = 0; i < k; i++) move.appendChild(span(c.tickerTeks));
    var pps = { lambat: 40, sedang: 70, cepat: 110 }[c.tickerKecepatan] || 70;
    move.style.setProperty('--dur', ((w * k) / pps).toFixed(1) + 's');
  }
  function pasangTicker(c) {
    hapus('#tkBar');
    var tampil = c.tickerAktif && c.tickerTeks && !(c.tickerBisaDitutup && disembunyikan(c));
    document.documentElement.classList.toggle('tk-on', Boolean(tampil));
    if (!tampil) return;
    var bar = bangunTicker(c, false, false);
    document.body.insertBefore(bar, document.body.firstChild);
    ukurTicker(bar, c);
    var x = bar.querySelector('.tk-x');
    if (x) x.addEventListener('click', function () {
      try { localStorage.setItem(HIDE, hash(c.tickerTeks)); } catch (e) {}
      bar.remove(); document.documentElement.classList.remove('tk-on');
    });
  }

  /* ---------- tema ---------- */
  function salju() {
    if (document.querySelector('.natal-snow') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    var w = document.createElement('div'); w.className = 'natal-snow'; w.setAttribute('aria-hidden', 'true');
    var n = window.innerWidth < 640 ? 16 : 28, i;
    for (i = 0; i < n; i++) {
      var f = document.createElement('i'), s = 3 + Math.random() * 6;
      f.style.cssText = 'left:' + (Math.random() * 100).toFixed(1) + '%;width:' + s.toFixed(1) + 'px;height:' + s.toFixed(1) + 'px;opacity:' + (0.45 + Math.random() * 0.5).toFixed(2) +
        ';animation-duration:' + (9 + Math.random() * 10).toFixed(1) + 's;animation-delay:-' + (Math.random() * 16).toFixed(1) + 's;--dx:' + ((Math.random() * 80) - 40).toFixed(0) + 'px';
      w.appendChild(f);
    }
    document.body.appendChild(w);
  }
  function dekorasi(natal, c) {
    hapus('.natal-snow'); hapus('.natal-salam');
    if (!natal) return;
    if (c.salju) salju();
    var host = document.querySelector('.hero-section .container, .dk-hero .container');
    if (host) { var d = document.createElement('div'); d.className = 'natal-salam'; d.textContent = '🎄 ' + c.ucapan + ' ✨'; host.insertBefore(d, host.firstChild); }
  }
  var terkini = null, antre = false;
  function gambar() { var c = terkini; dekorasi(natalAktif(c), c); pasangTicker(c); }
  function terapkan(c) {
    var h = document.documentElement, natal = natalAktif(c);
    terkini = c;                                   // selalu pakai pengaturan paling baru
    if (natal) h.setAttribute('data-tema', 'natal'); else h.removeAttribute('data-tema');
    h.classList.toggle('no-salju', !c.salju);
    h.classList.toggle('no-lampu', !c.lampu);
    if (document.body) gambar();
    else if (!antre) { antre = true; document.addEventListener('DOMContentLoaded', function () { antre = false; gambar(); }); }
  }

  function muat(db) {
    return Promise.resolve().then(function () { return db.collection('pengurus').doc('pengaturan').get(); })
      .then(function (s) { return gabung(s.exists ? s.data() : {}); })
      .catch(function (e) { console.warn('Pengaturan tampilan memakai cadangan:', e && e.message); return null; });
  }
  function mulai(db) {
    if (MANUAL) return;
    muat(db).then(function (c) {
      if (!c) { if (!baca()) terapkan(gabung({})); return; }
      simpan(c); terapkan(c);
    });
  }

  var timer;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { var bar = document.getElementById('tkBar'), c = baca(); if (bar && c) ukurTicker(bar, c); }, 250);
  });

  if (!MANUAL) { var awal = baca(); if (awal) terapkan(awal); }   // pakai simpanan terakhir dulu agar tidak berkedip

  window.PENG = { DEFAULT: DEFAULT, gabung: gabung, muat: muat, mulai: mulai, terapkan: terapkan,
    musimNatal: musimNatal, natalAktif: natalAktif, bangunTicker: bangunTicker, ukurTicker: ukurTicker };
})();
