/* Musik latar dari YouTube untuk halaman publik.
   Data: Firestore pengurus/musik  { aktif, acak, volume, items:[{id, judul}] }  (diatur admin di admin-musik.html)

   Catatan browser: Chrome/Safari/Firefox MELARANG suara otomatis sebelum pengunjung berinteraksi.
   Cara kerja di sini: coba putar dengan suara; kalau diblokir, musik jalan dalam keadaan bisu dan
   suaranya menyala pada sentuhan/klik/tombol pertama. Pilihan "jeda" dari pengunjung diingat 7 hari.
   Posisi lagu disimpan per tab, jadi berpindah halaman melanjutkan lagu yang sama. */
(function () {
  if (window.MUSIK) return;
  var SS = 'mz_state_v1', LS = 'mz_pref_v1', HARI7 = 7 * 24 * 3600 * 1000;
  var cfg = null, list = [], idx = 0, player = null, ready = false, wantPlay = true, gestureArmed = false, startedMuted = false;
  var el = {}, tick = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sget(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function userOff() { try { var p = JSON.parse(localStorage.getItem(LS) || 'null'); return !!(p && p.off && Date.now() - p.t < HARI7); } catch (e) { return false; } }
  function setUserOff(v) { try { if (v) localStorage.setItem(LS, JSON.stringify({ off: 1, t: Date.now() })); else localStorage.removeItem(LS); } catch (e) {} }

  function gabung(d) {
    d = d || {};
    var items = Array.isArray(d.items) ? d.items.filter(function (x) { return x && /^[\w-]{11}$/.test(x.id || ''); }).slice(0, 10) : [];
    var v = Number(d.volume); if (!(v >= 0 && v <= 100)) v = 50;
    return { aktif: d.aktif === true && items.length > 0, acak: d.acak === true, volume: v, items: items };
  }

  /* ---------- urutan lagu (acak dibuat sekali per tab) ---------- */
  function buatUrutan(n, acak) {
    var s = sget(SS), key = n + (acak ? 'r' : 's');
    if (s && s.key === key && Array.isArray(s.order) && s.order.length === n) return s.order;
    var o = [], i, j, t;
    for (i = 0; i < n; i++) o.push(i);
    if (acak) for (i = n - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = o[i]; o[i] = o[j]; o[j] = t; }
    return o;
  }
  var order = [], pos = 0;
  function simpanPosisi() {
    if (!player || !ready) return;
    var t = 0; try { t = player.getCurrentTime() || 0; } catch (e) {}
    sset(SS, { key: list.length + (cfg.acak ? 'r' : 's'), order: order, pos: pos, t: Math.floor(t), vol: curVol() });
  }
  function curVol() { try { return player.getVolume(); } catch (e) { return cfg.volume; } }

  /* ---------- tampilan ---------- */
  function bangunUI() {
    var w = document.createElement('div');
    w.className = 'mz'; w.id = 'mzWidget';
    w.innerHTML =
      '<div class="mz-panel" id="mzPanel" hidden>' +
        '<div class="mz-now"><span class="mz-eq" aria-hidden="true"><i></i><i></i><i></i></span><div><small>Sedang diputar</small><b id="mzTitle">Musik</b></div></div>' +
        '<div class="mz-ctl">' +
          '<button type="button" id="mzPrev" aria-label="Lagu sebelumnya"><i class="fas fa-backward-step"></i></button>' +
          '<button type="button" id="mzPlay" class="mz-main" aria-label="Putar atau jeda"><i class="fas fa-play"></i></button>' +
          '<button type="button" id="mzNext" aria-label="Lagu berikutnya"><i class="fas fa-forward-step"></i></button>' +
          '<button type="button" id="mzMute" aria-label="Bisukan atau bunyikan"><i class="fas fa-volume-high"></i></button>' +
        '</div>' +
        '<label class="mz-vol"><i class="fas fa-volume-low" aria-hidden="true"></i><input type="range" id="mzVol" min="0" max="100" step="1" aria-label="Volume"></label>' +
        '<div class="mz-tip" id="mzTip" hidden>Ketuk di mana saja untuk menyalakan suara</div>' +
      '</div>' +
      '<div class="mz-yt" aria-hidden="true"><div id="mzYT"></div></div>' +
      '<button type="button" class="mz-fab" id="mzFab" aria-label="Pemutar musik" aria-expanded="false"><i class="fas fa-music"></i><span class="mz-dot" id="mzDot" hidden></span></button>';
    document.body.appendChild(w);
    ['Panel', 'Title', 'Prev', 'Play', 'Next', 'Mute', 'Vol', 'Tip', 'Fab', 'Dot', 'Widget'].forEach(function (k) { el[k] = document.getElementById('mz' + k); });
    el.Fab.addEventListener('click', function () {
      var open = el.Panel.hidden; el.Panel.hidden = !open; el.Fab.setAttribute('aria-expanded', String(open));
    });
    el.Play.addEventListener('click', function () { togglePlay(); });
    el.Next.addEventListener('click', function () { lagu(pos + 1, true); });
    el.Prev.addEventListener('click', function () { lagu(pos - 1, true); });
    el.Mute.addEventListener('click', function () { if (!player) return; if (player.isMuted()) { player.unMute(); startedMuted = false; el.Tip.hidden = true; } else player.mute(); ui(); });
    el.Vol.addEventListener('input', function () { if (!player) return; player.setVolume(+el.Vol.value); if (player.isMuted() && +el.Vol.value > 0) { player.unMute(); startedMuted = false; el.Tip.hidden = true; } ui(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !el.Panel.hidden) { el.Panel.hidden = true; el.Fab.setAttribute('aria-expanded', 'false'); } });
  }
  function ui() {
    if (!player || !ready) return;
    var st = -1, muted = false; try { st = player.getPlayerState(); muted = player.isMuted(); } catch (e) {}
    var main = st === 1 || st === 3;
    el.Widget.classList.toggle('playing', main && !muted);
    el.Widget.classList.toggle('muted', muted);
    el.Play.innerHTML = '<i class="fas ' + (main ? 'fa-pause' : 'fa-play') + '"></i>';
    el.Mute.innerHTML = '<i class="fas ' + (muted ? 'fa-volume-xmark' : 'fa-volume-high') + '"></i>';
    el.Dot.hidden = !(main && muted);
    try { el.Vol.value = player.getVolume(); var d = player.getVideoData(); if (d && d.title) el.Title.textContent = d.title; } catch (e) {}
  }

  /* ---------- pemutaran ---------- */
  function lagu(p, manual) {
    if (!player || !ready) return;
    pos = ((p % order.length) + order.length) % order.length;
    var item = list[order[pos]];
    if (manual) { wantPlay = true; setUserOff(false); }
    player.loadVideoById({ videoId: item.id, startSeconds: 0 });
    simpanPosisi(); ui();
  }
  function togglePlay() {
    if (!player || !ready) return;
    var st = player.getPlayerState();
    if (st === 1 || st === 3) { player.pauseVideo(); wantPlay = false; setUserOff(true); }
    else { wantPlay = true; setUserOff(false); if (player.isMuted() && startedMuted) { player.unMute(); startedMuted = false; el.Tip.hidden = true; } player.playVideo(); }
    ui();
  }
  function pasangGestur() {
    if (gestureArmed) return; gestureArmed = true;
    var evs = ['pointerup', 'touchend', 'keydown', 'click'];
    function go() {
      evs.forEach(function (n) { document.removeEventListener(n, go, true); }); gestureArmed = false;
      if (!player || !ready || userOff()) return;
      try { player.unMute(); player.setVolume(cfg.volume); startedMuted = false; player.playVideo(); } catch (e) {}
      el.Tip.hidden = true; setTimeout(ui, 300);
    }
    evs.forEach(function (n) { document.addEventListener(n, go, true); });
  }
  function mulaiOtomatis() {
    var s = sget(SS), t = (s && s.pos === pos && s.t) ? s.t : 0;
    var item = list[order[pos]];
    player.setVolume(s && typeof s.vol === 'number' ? s.vol : cfg.volume);
    if (userOff()) { wantPlay = false; player.cueVideoById({ videoId: item.id, startSeconds: t }); ui(); return; }
    player.unMute();
    player.loadVideoById({ videoId: item.id, startSeconds: t });
    // Kalau 2,5 dtk kemudian belum jalan (diblokir), ulangi dalam keadaan bisu lalu tunggu sentuhan pertama.
    setTimeout(function () {
      var st = -1; try { st = player.getPlayerState(); } catch (e) {}
      if (st !== 1 && wantPlay) cobaBisu();
    }, 2500);
  }
  function cobaBisu() {
    try { player.mute(); player.playVideo(); } catch (e) {}
    startedMuted = true; el.Tip.hidden = false; pasangGestur(); setTimeout(ui, 400);
  }

  function onState(e) {
    var st = e.data;
    if (st === 0) lagu(pos + 1, false);                       // selesai -> lagu berikutnya
    if (st === 1 && startedMuted) { el.Tip.hidden = false; pasangGestur(); }
    if (st === 1 || st === 2 || st === 3) ui();
    if (st === 1) { try { if (!player.isMuted()) { startedMuted = false; el.Tip.hidden = true; } } catch (x) {} }
  }
  var gagal = 0;
  function onError() {                                         // video tidak bisa disematkan / dihapus -> lewati
    gagal++; if (gagal >= list.length) { if (el.Widget) el.Widget.remove(); console.warn('Musik: semua video gagal diputar.'); return; }
    lagu(pos + 1, false);
  }

  function muatAPI(cb) {
    if (window.YT && window.YT.Player) return cb();
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (prev) try { prev(); } catch (e) {} cb(); };
    var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; document.head.appendChild(s);
  }
  function jalan(c) {
    cfg = c; list = c.items;
    order = buatUrutan(list.length, c.acak);
    var s = sget(SS); pos = (s && s.key === list.length + (c.acak ? 'r' : 's') && typeof s.pos === 'number') ? Math.min(s.pos, order.length - 1) : 0;
    bangunUI();
    muatAPI(function () {
      player = new YT.Player('mzYT', {
        width: 200, height: 113, videoId: list[order[pos]].id,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, rel: 0, modestbranding: 1, fs: 0, iv_load_policy: 3, origin: location.origin },
        events: {
          onReady: function () { ready = true; mulaiOtomatis(); ui(); },
          onStateChange: onState, onError: onError,
          onAutoplayBlocked: function () { if (wantPlay) cobaBisu(); }
        }
      });
      tick = setInterval(function () { simpanPosisi(); ui(); }, 2000);
      window.addEventListener('pagehide', simpanPosisi);
    });
  }

  function mulai(db) {
    if (!db) return;
    Promise.resolve().then(function () { return db.collection('pengurus').doc('musik').get(); })
      .then(function (s) { var c = gabung(s.exists ? s.data() : {}); if (c.aktif) jalan(c); })
      .catch(function (e) { console.warn('Musik tidak dimuat:', e && e.message); });
  }
  window.MUSIK = { mulai: mulai, gabung: gabung };

  function auto() { try { if (window.firebase && firebase.apps && firebase.apps.length && firebase.firestore) mulai(firebase.firestore()); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
