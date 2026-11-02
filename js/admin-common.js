/* Kerangka bersama halaman admin: Firebase, sidebar, topbar, login, notifikasi, dialog */
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyCwQGsFPBIs_gk0Xc1hscpG-7n6M16gqWc",
    authDomain: "rnhkbp-pelikan.firebaseapp.com",
    projectId: "rnhkbp-pelikan",
    storageBucket: "rnhkbp-pelikan.firebasestorage.app",
    messagingSenderId: "202813062166",
    appId: "1:202813062166:web:eb3d963d5965a5e6f48937"
  };
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  /* Satu-satunya daftar menu admin */
  const NAV = [
    { href: 'dashboard.html', key: 'dashboard', icon: 'fa-house', label: 'Dashboard' },
    { group: 'Kelola' },
    { href: 'absensi.html', key: 'absensi', icon: 'fa-clipboard-check', label: 'Absensi' },
    { href: 'admin-artikel.html', key: 'artikel', icon: 'fa-newspaper', label: 'Artikel & Dokumentasi' },
    { href: 'admin-renungan.html', key: 'renungan', icon: 'fa-book-bible', label: 'Renungan' },
    { href: 'admin-kegiatan.html', key: 'kegiatan', icon: 'fa-calendar-check', label: 'Kegiatan' },
    { href: 'anggota.html', key: 'anggota', icon: 'fa-users', label: 'Anggota' },
    { href: 'admin-kepengurusan.html', key: 'kepengurusan', icon: 'fa-user-tie', label: 'Kepengurusan' },
    { group: 'Tampilan situs' },
    { href: 'admin-tentang.html', key: 'tentang', icon: 'fa-image', label: 'Foto Tentang Kami' },
    { href: 'admin-kontak.html', key: 'kontak', icon: 'fa-address-book', label: 'Info Kontak' },
    { href: 'admin-pengaturan.html', key: 'pengaturan', icon: 'fa-palette', label: 'Tema & Pengumuman' },
    { href: 'admin-partitur.html', key: 'partitur', icon: 'fa-music', label: 'Partitur' }
  ];

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const fmtDateStr = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    return m ? `${parseInt(m[3], 10)} ${BULAN[parseInt(m[2], 10) - 1]} ${m[1]}` : (s || '-');
  };
  const fmtTs = (v) => {
    let d = null;
    if (v && typeof v.toDate === 'function') d = v.toDate(); else if (v instanceof Date) d = v; else if (typeof v === 'string') return fmtDateStr(v);
    return d && !isNaN(d) ? `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}` : '-';
  };

  /* ---------- Notifikasi ---------- */
  function toast(message, type) {
    type = type || 'info';
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const icon = { success: 'fa-circle-check', error: 'fa-circle-exclamation', warn: 'fa-triangle-exclamation', info: 'fa-circle-info' }[type] || 'fa-circle-info';
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<i class="fas ${icon}"></i><span></span>`;
    el.querySelector('span').textContent = message;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 380); }, type === 'error' ? 6500 : 4000);
  }

  /* ---------- Modal ---------- */
  function openModal(id) { const m = document.getElementById(id); if (m) { m.classList.add('show'); const f = m.querySelector('input,select,textarea,button'); if (f) setTimeout(() => f.focus(), 30); } }
  function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('show'); }
  document.addEventListener('click', (e) => { if (e.target.classList && e.target.classList.contains('modal-back')) e.target.classList.remove('show'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal-back.show').forEach((m) => m.classList.remove('show')); });

  function confirmBox(opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const back = document.createElement('div');
      back.className = 'modal-back show';
      back.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3></h3><p></p><div class="modal-actions"><button type="button" class="btn btn-ghost" data-r="0">Batal</button><button type="button" class="btn ${opts.danger ? 'btn-danger' : ''}" data-r="1"></button></div></div>`;
      back.querySelector('h3').textContent = opts.title || 'Yakin?';
      back.querySelector('p').textContent = opts.text || '';
      back.querySelector('[data-r="1"]').textContent = opts.ok || 'Ya, lanjutkan';
      const done = (v) => { document.removeEventListener('keydown', onKey); back.remove(); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') done(false); };
      document.addEventListener('keydown', onKey);
      back.addEventListener('click', (e) => { if (e.target === back) done(false); const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); });
      document.body.appendChild(back);
      back.querySelector('[data-r="0"]').focus();
    });
  }

  /* ---------- Kerangka: sidebar + topbar ---------- */
  function mountShell() {
    const active = document.body.dataset.active || '';
    const title = document.body.dataset.title || '';
    const side = document.getElementById('sidebar');
    if (side) {
      side.setAttribute('aria-label', 'Menu admin');
      side.innerHTML = `<div class="side-brand"><img src="logo.png" alt=""><div><b>R-NHKBP Pelikan</b><small>Panel admin</small></div></div>` +
        NAV.map((n) => n.group
          ? `<div class="side-group">${esc(n.group)}</div>`
          : `<a class="side-link" href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}><i class="fas ${n.icon}"></i> ${esc(n.label)}</a>`).join('') +
        `<div class="side-foot"><a class="side-link" href="index.html" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i> Lihat website</a></div>`;
    }
    const top = document.getElementById('topbar');
    if (top) {
      top.innerHTML = `<div class="topbar-left"><button class="menu-btn" id="menuBtn" type="button" aria-label="Buka menu"><i class="fas fa-bars"></i></button><span class="crumb">${esc(title)}</span></div>` +
        `<div class="who"><div class="who-chip"><span class="av" id="avatar">A</span><span class="em" id="adminEmail"></span></div><button class="btn btn-ghost btn-sm" type="button" id="logoutBtn"><i class="fas fa-right-from-bracket"></i> Keluar</button></div>`;
    }
    const shell = document.getElementById('shell');
    const mb = document.getElementById('menuBtn');
    if (mb && shell) mb.addEventListener('click', () => shell.classList.toggle('open'));
    const sc = document.getElementById('scrim');
    if (sc && shell) sc.addEventListener('click', () => shell.classList.remove('open'));
    const lb = document.getElementById('logoutBtn');
    if (lb) lb.addEventListener('click', logout);
  }

  function logout() {
    auth.signOut().then(() => { location.href = 'login.html'; }).catch((e) => toast('Gagal keluar: ' + e.message, 'error'));
  }

  /* Wajib login; kalau belum, kembali ke login.html */
  function requireAuth(cb) {
    auth.onAuthStateChanged((user) => {
      if (!user) { location.href = 'login.html'; return; }
      const em = document.getElementById('adminEmail'); if (em) em.textContent = user.email || '';
      const av = document.getElementById('avatar'); if (av) av.textContent = (user.email || 'A').charAt(0).toUpperCase();
      if (cb) cb(user);
    });
  }

  mountShell();
  window.AdminApp = { auth, db, esc, toast, todayISO, fmtDateStr, fmtTs, openModal, closeModal, confirmBox, requireAuth, logout, NAV };
})();
