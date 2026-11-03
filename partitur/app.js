import { sb, $, escapeHtml, store, getDriveFileId, driveViewUrl, drivePreviewUrl, driveDownloadUrl, driveThumbUrl } from './common.js';

const NEW_DAYS = 7;
let songs = [];
let activeCategory = 'Semua';
let firstLoad = true;

const showStatus = (m) => { $('statusMessage').textContent = m || ''; };
let toastTimer;
function toast(message) {
  const t = $('toast');
  t.textContent = message;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 7000);
}

/* ---------- Daftar ---------- */
function renderCategories() {
  const cats = ['Semua', ...new Set(songs.map(s => s.category).filter(Boolean))].sort((a, b) => a === 'Semua' ? -1 : b === 'Semua' ? 1 : a.localeCompare(b, 'id'));
  if (!cats.includes(activeCategory)) activeCategory = 'Semua';
  $('categoryBar').innerHTML = cats.length > 2 ? cats.map(c =>
    `<button type="button" class="chip" data-cat="${escapeHtml(c)}" aria-pressed="${c === activeCategory}">${escapeHtml(c)}</button>`).join('') : '';
}

function renderSongs() {
  renderCategories();
  const term = $('searchInput').value.trim().toLocaleLowerCase('id');
  const list = songs.filter(s => (activeCategory === 'Semua' || s.category === activeCategory) &&
    [s.title, s.creator, s.category].join(' ').toLocaleLowerCase('id').includes(term));
  $('songCount').textContent = `${list.length} partitur`;
  if (!list.length) {
    $('songGrid').innerHTML = '';
    showStatus(songs.length ? 'Tidak ada partitur yang cocok. Coba kata kunci atau kategori lain.' : 'Belum ada partitur.');
    return;
  }
  showStatus('');
  const now = Date.now();
  $('songGrid').innerHTML = list.map(s => `
    <article class="song-card">
      <button class="thumb" type="button" data-view="${escapeHtml(s.id)}" aria-label="Lihat ${escapeHtml(s.title)}">
        <span class="thumb-fallback" aria-hidden="true">♫</span>
        <img src="${driveThumbUrl(s.driveFileId)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
        ${s.created && now - s.created < NEW_DAYS * 864e5 ? '<span class="badge-new">BARU</span>' : ''}
      </button>
      <div class="card-body">
        <span class="pill">${escapeHtml(s.category)}</span>
        <h3><a class="song-link" href="${window.SEO.urlLagu({ id: s.id, judul: s.title })}">${escapeHtml(s.title)}</a></h3>
        <p class="song-meta">${escapeHtml(s.creator || 'Pencipta tidak dicantumkan')}</p>
        <div class="card-actions">
          <button class="button button-outline" type="button" data-view="${escapeHtml(s.id)}">Lihat</button>
          <button class="button" type="button" data-download="${escapeHtml(s.id)}">Unduh PDF</button>
          <button class="button button-outline icon" type="button" data-share="${escapeHtml(s.id)}" aria-label="Bagikan ${escapeHtml(s.title)}" title="Bagikan tautan lagu">⤴</button>
        </div>
      </div>
    </article>`).join('');
}

async function loadSongs() {
  const { data, error } = await sb.from('lagu').select('*').order('judul');
  if (error) {
    console.error(error);
    showStatus('Gagal memuat data. Periksa tabel dan policy di Supabase (lihat README.md).');
    $('songCount').textContent = '';
    return;
  }
  songs = data.map(d => ({
    id: d.id, title: d.judul || 'Tanpa judul', creator: d.pencipta || '', category: d.kategori || 'Umum',
    created: d.created_at ? Date.parse(d.created_at) : 0, driveFileId: getDriveFileId(d.pdf_url)
  })).filter(s => s.driveFileId).sort((a, b) => a.title.localeCompare(b.title, 'id'));
  renderSongs();
  if (firstLoad) { firstLoad = false; showNewBanner(); }
}

/* ---------- Notifikasi lagu baru ---------- */
function showNewBanner() {
  const lastSeen = Number(store.get('rnhkbp:lastSeen') || 0);
  const fresh = lastSeen ? songs.filter(s => s.created > lastSeen) : [];
  if (!fresh.length) { store.set('rnhkbp:lastSeen', String(Date.now())); return; }
  const names = fresh.slice(0, 3).map(s => escapeHtml(s.title)).join(', ');
  $('newBanner').innerHTML = `<span>🔔 <strong>${fresh.length} partitur baru</strong> sejak kunjunganmu: ${names}${fresh.length > 3 ? ', dan lainnya' : ''}</span><button type="button" class="button button-outline" data-dismiss>Tutup</button>`;
  $('newBanner').classList.remove('hidden');
}
$('newBanner').addEventListener('click', (e) => {
  if (!e.target.closest('[data-dismiss]')) return;
  store.set('rnhkbp:lastSeen', String(Date.now()));
  $('newBanner').classList.add('hidden');
});

function updateNotifyBtn() {
  $('notifyBtn').classList.toggle('hidden', !('Notification' in window) || Notification.permission !== 'default');
}
$('notifyBtn').addEventListener('click', async () => {
  const result = await Notification.requestPermission();
  updateNotifyBtn();
  if (result === 'granted') toast('Notifikasi aktif. Kamu akan diberi tahu saat halaman ini terbuka dan ada partitur baru.');
});
updateNotifyBtn();

// Real-time: saat admin menambah lagu, pengunjung yang sedang membuka halaman langsung diberi tahu.
sb.channel('lagu-perubahan')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'lagu' }, async (payload) => {
    if (payload.eventType === 'INSERT') {
      const title = payload.new.judul || 'Partitur baru';
      toast(`🔔 Partitur baru: ${title}`);
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification('Partitur baru', { body: title }); } catch { /* abaikan */ }
      }
    }
    await loadSongs();
  }).subscribe();

/* ---------- Pencarian, filter, pratinjau ---------- */
$('searchInput').addEventListener('input', renderSongs);
$('categoryBar').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-cat]');
  if (chip) { activeCategory = chip.dataset.cat; renderSongs(); }
});
$('songGrid').addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.remove(); }, true);

const viewer = $('viewer');
$('viewerClose').addEventListener('click', () => viewer.close());
viewer.addEventListener('close', () => { $('viewerFrame').src = 'about:blank'; });
viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });

$('songGrid').addEventListener('click', (e) => {
  const pick = (a) => { const el = e.target.closest(`[data-${a}]`); return el ? songs.find(s => s.id === el.dataset[a]) : null; };
  const v = pick('view'), d = pick('download'), sh = pick('share');
  if (v) {
    $('viewerTitle').textContent = v.title;
    $('viewerFrame').src = drivePreviewUrl(v.driveFileId);
    $('viewerDownload').href = driveDownloadUrl(v.driveFileId);
    $('viewerOpen').href = driveViewUrl(v.driveFileId);
    viewer.showModal();
  }
  if (d) window.open(driveDownloadUrl(d.driveFileId), '_blank', 'noopener,noreferrer');
  if (sh) shareSong(sh);
});

/* ---------- Bagikan tautan lagu ---------- */
async function shareSong(s) {
  const url = window.SEO.urlLagu({ id: s.id, judul: s.title }, true);
  const text = `Partitur ${s.title}${s.creator ? ' – ' + s.creator : ''}`;
  if (navigator.share) {
    try { await navigator.share({ title: text, text, url }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toast('Tautan partitur disalin: ' + url); }
  catch { window.prompt('Salin tautan ini:', url); }
}

loadSongs();
