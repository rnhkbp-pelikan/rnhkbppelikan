import { sb, createClient, SUPABASE_URL, SUPABASE_KEY, APPS_SCRIPT_URL, $, escapeHtml, getDriveFileId, driveViewUrl } from './common.js';
import { PDFDocument } from 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm';

let me = null, isAdmin = false, recovery = false, forgot = false;
let songs = [], editingId = null, photos = [];

const show = (id, on) => $(id).classList.toggle('hidden', !on);
const say = (id, msg) => { $(id).textContent = msg || ''; };

/* ---------- Tampilan sesuai status login ---------- */
function render() {
  const gate = recovery || !me || !isAdmin;
  show('gate', gate); show('dash', !gate);
  show('recoveryBox', recovery);
  show('loginBox', !recovery && !me && !forgot);
  show('forgotBox', !recovery && !me && forgot);
  show('denyBox', !recovery && !!me && !isAdmin);
  show('logoutBtn', !!me && !recovery);
  if (me && !isAdmin) $('denyText').textContent = `Akun ${me.email} belum terdaftar sebagai admin. Minta admin lain menambahkannya.`;
  if (!gate) { $('whoami').textContent = `Masuk sebagai ${me.email}`; loadSongs(); loadAdmins(); }
}

async function applySession(session) {
  me = (session && session.user) || null;
  isAdmin = false;
  if (me) {
    const { data } = await sb.from('admins').select('user_id').eq('user_id', me.id).maybeSingle();
    isAdmin = Boolean(data);
  }
  render();
}

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') recovery = true;
  setTimeout(() => applySession(session), 0);
});
const hash = new URLSearchParams(location.hash.slice(1));
if (hash.get('type') === 'recovery') recovery = true;
if (hash.get('error_description')) { forgot = true; setTimeout(() => say('forgotMsg', 'Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.'), 0); }
sb.auth.getSession().then(({ data }) => applySession(data.session));

/* ---------- Login, lupa & ganti kata sandi ---------- */
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  say('loginMsg', 'Sedang masuk…');
  const { error } = await sb.auth.signInWithPassword({ email: $('adminEmail').value.trim(), password: $('adminPassword').value });
  if (error) {
    say('loginMsg', /invalid login/i.test(error.message) ? 'Email atau kata sandi salah.'
      : /confirm/i.test(error.message) ? 'Email belum dikonfirmasi. Cek emailmu atau konfirmasi di Supabase → Authentication → Users.'
      : `Gagal masuk: ${error.message}`);
    return;
  }
  say('loginMsg', ''); $('loginForm').reset();
});
const logout = () => sb.auth.signOut();
$('logoutBtn').addEventListener('click', logout);
$('denyLogout').addEventListener('click', logout);

$('forgotLink').addEventListener('click', () => { forgot = true; $('forgotEmail').value = $('adminEmail').value; render(); });
$('backLogin').addEventListener('click', () => { forgot = false; render(); });
$('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('forgotBtn').disabled = true; say('forgotMsg', 'Mengirim…');
  const redirectTo = new URL('admin-partitur.html', location.href).href;
  const { error } = await sb.auth.resetPasswordForEmail($('forgotEmail').value.trim(), { redirectTo });
  $('forgotBtn').disabled = false;
  say('forgotMsg', error
    ? (/rate limit/i.test(error.message) ? 'Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.' : `Gagal mengirim: ${error.message}`)
    : 'Jika email terdaftar, tautan reset sudah dikirim. Cek kotak masuk dan folder spam.');
});

async function changePassword(passId, pass2Id, msgId, form) {
  const p = $(passId).value;
  if (p !== $(pass2Id).value) { say(msgId, 'Kata sandi tidak sama.'); return false; }
  say(msgId, 'Menyimpan…');
  const { error } = await sb.auth.updateUser({ password: p });
  if (error) { say(msgId, `Gagal: ${error.message}`); return false; }
  form.reset(); say(msgId, 'Kata sandi berhasil diganti.');
  return true;
}
$('recoveryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (await changePassword('recPass', 'recPass2', 'recoveryMsg', e.target)) {
    recovery = false;
    history.replaceState(null, '', location.pathname);
    const { data } = await sb.auth.getSession();
    applySession(data.session);
  }
});
$('passForm').addEventListener('submit', (e) => { e.preventDefault(); changePassword('myPass', 'myPass2', 'passMsg', e.target); });

/* ---------- Tab ---------- */
document.querySelector('.tabs').addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]'); if (!t) return;
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', String(b === t)));
  ['songs', 'admins', 'account'].forEach(n => show(`tab-${n}`, n === t.dataset.tab));
});

/* ---------- Foto → PDF → Google Drive ---------- */
async function toJpeg(file, maxSide = 2000, quality = 0.85) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', quality));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h };
}
async function buildPdf(files) {
  const pdf = await PDFDocument.create();
  const A4 = [595.28, 841.89], margin = 18;
  for (const f of files) {
    const { bytes, w, h } = await toJpeg(f);
    const img = await pdf.embedJpg(bytes);
    const [pw, ph] = w > h ? [A4[1], A4[0]] : A4;
    const s = Math.min((pw - 2 * margin) / w, (ph - 2 * margin) / h);
    pdf.addPage([pw, ph]).drawImage(img, { x: (pw - w * s) / 2, y: (ph - h * s) / 2, width: w * s, height: h * s });
  }
  return pdf.save();
}
function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function uploadPdf(bytes, name) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.startsWith('GANTI')) throw new Error('APPS_SCRIPT_URL belum diisi di common.js (lihat README.md).');
  const { data } = await sb.auth.getSession();
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: data.session.access_token, name, data: toBase64(bytes) })
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    const hint = text.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    throw new Error('Apps Script membalas halaman HTML, bukan data. Cek URL /exec dan pengaturan deploy (Execute as: Me, Access: Anyone). Isi balasan: ' + hint);
  }
  if (!json.ok) throw new Error(json.error || 'Upload ke Google Drive gagal.');
  return json.url;
}

/* ---------- Form partitur ---------- */
function renderPhotos() {
  $('photoList').innerHTML = photos.map((p, i) => `
    <li><img src="${p.url}" alt="" /><span class="pname">${i + 1}. ${escapeHtml(p.file.name)}</span>
    <span class="pbtns">
      <button type="button" class="button button-outline" data-act="up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Naikkan">↑</button>
      <button type="button" class="button button-outline" data-act="down" data-i="${i}" ${i === photos.length - 1 ? 'disabled' : ''} aria-label="Turunkan">↓</button>
      <button type="button" class="button button-danger" data-act="rm" data-i="${i}" aria-label="Hapus foto">✕</button>
    </span></li>`).join('');
}
$('photoInput').addEventListener('change', (e) => {
  for (const f of e.target.files) photos.push({ file: f, url: URL.createObjectURL(f) });
  e.target.value = ''; renderPhotos();
});
$('photoList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const i = Number(b.dataset.i), a = b.dataset.act;
  if (a === 'rm') { URL.revokeObjectURL(photos[i].url); photos.splice(i, 1); }
  else if (a === 'up' && i > 0) { [photos[i - 1], photos[i]] = [photos[i], photos[i - 1]]; }
  else if (a === 'down' && i < photos.length - 1) { [photos[i + 1], photos[i]] = [photos[i], photos[i + 1]]; }
  renderPhotos();
});
const mode = () => document.querySelector('input[name=source]:checked').value;
function syncMode() { show('photoBox', mode() === 'photo'); show('linkBox', mode() === 'link'); }
document.querySelectorAll('input[name=source]').forEach(r => r.addEventListener('change', syncMode));

function resetForm() {
  editingId = null; $('songForm').reset();
  photos.forEach(p => URL.revokeObjectURL(p.url)); photos = []; renderPhotos();
  $('formTitle').textContent = 'Tambah partitur'; $('saveBtn').textContent = 'Tambah partitur';
  show('cancelEdit', false); syncMode();
}
$('cancelEdit').addEventListener('click', () => { resetForm(); say('formMsg', ''); });

$('songForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isAdmin) return;
  const title = $('songTitle').value.trim();
  $('saveBtn').disabled = true;
  try {
    let link;
    if (mode() === 'photo') {
      if (!photos.length) throw new Error('Pilih minimal satu foto.');
      say('formMsg', 'Membuat PDF dari foto…');
      const bytes = await buildPdf(photos.map(p => p.file));
      if (bytes.length > 20 * 1024 * 1024) throw new Error('PDF lebih dari 20 MB. Kurangi jumlah foto.');
      say('formMsg', 'Mengunggah PDF ke Google Drive…');
      link = await uploadPdf(bytes, title);
    } else {
      link = $('songDriveLink').value.trim();
      if (!getDriveFileId(link)) throw new Error('Link Google Drive tidak valid.');
    }
    say('formMsg', 'Menyimpan data…');
    const row = { judul: title, pencipta: $('songCreator').value.trim(), kategori: $('songCategory').value.trim() || 'Umum', pdf_url: link };
    const wasEditing = Boolean(editingId);
    const { error } = wasEditing ? await sb.from('lagu').update(row).eq('id', editingId) : await sb.from('lagu').insert(row);
    if (error) throw error;
    resetForm();
    say('formMsg', wasEditing ? 'Perubahan disimpan.' : 'Partitur ditambahkan. Pengunjung yang sedang online akan mendapat notifikasi.');
    loadSongs();
  } catch (err) {
    console.error(err);
    say('formMsg', /row-level security/i.test(err.message || '') ? 'Ditolak database. Pastikan akunmu ada di tabel admins.' : `Gagal: ${err.message || err}`);
  } finally { $('saveBtn').disabled = false; }
});

/* ---------- Daftar partitur ---------- */
async function loadSongs() {
  const { data, error } = await sb.from('lagu').select('*').order('created_at', { ascending: false });
  if (error) { say('formMsg', `Gagal memuat daftar: ${error.message}`); return; }
  songs = data;
  $('adminSongCount').textContent = `(${songs.length})`;
  $('categoryList').innerHTML = [...new Set(songs.map(s => s.kategori).filter(Boolean))].map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
  $('adminSongList').innerHTML = songs.length ? songs.map(s => `
    <li class="row"><div><strong>${escapeHtml(s.judul)}</strong><span class="muted">${escapeHtml(s.pencipta || '—')} · ${escapeHtml(s.kategori || 'Umum')}</span></div>
    <div class="row-actions">
      <a class="button button-outline" href="${escapeHtml(s.pdf_url)}" target="_blank" rel="noopener noreferrer">Buka</a>
      <button class="button button-outline" type="button" data-edit="${s.id}">Edit</button>
      <button class="button button-danger" type="button" data-del="${s.id}">Hapus</button>
    </div></li>`).join('') : '<li class="muted">Belum ada partitur.</li>';
}
$('adminSongList').addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
  if (ed) {
    const s = songs.find(x => x.id === ed.dataset.edit); if (!s) return;
    editingId = s.id; resetFormFields(s);
  }
  if (del) {
    const s = songs.find(x => x.id === del.dataset.del);
    if (!s || !confirm(`Hapus partitur "${s.judul}"? File PDF di Google Drive tidak ikut terhapus.`)) return;
    const { error } = await sb.from('lagu').delete().eq('id', s.id);
    if (error) alert(`Gagal menghapus: ${error.message}`); else loadSongs();
  }
});
function resetFormFields(s) {
  $('songTitle').value = s.judul; $('songCreator').value = s.pencipta || ''; $('songCategory').value = s.kategori || '';
  document.querySelector('input[name=source][value=link]').checked = true;
  $('songDriveLink').value = s.pdf_url; syncMode();
  $('formTitle').textContent = 'Edit partitur'; $('saveBtn').textContent = 'Simpan perubahan'; show('cancelEdit', true);
  say('formMsg', 'Untuk mengganti file, pilih “Upload foto” lalu pilih foto baru.');
  $('songForm').scrollIntoView({ behavior: 'smooth' }); $('songTitle').focus();
}

/* ---------- Admin & pengguna ---------- */
async function loadAdmins() {
  const { data, error } = await sb.rpc('list_admins');
  if (error) { $('adminList').innerHTML = `<li class="muted">Gagal memuat: ${escapeHtml(error.message)}. Pastikan setup.sql sudah dijalankan.</li>`; return; }
  $('adminList').innerHTML = data.map(a => `
    <li class="row"><div><strong>${escapeHtml(a.email)}</strong>${a.user_id === me.id ? '<span class="muted">Ini kamu</span>' : ''}</div>
    <div class="row-actions">${a.user_id === me.id ? '' : `<button class="button button-danger" type="button" data-rm="${a.user_id}">Cabut akses admin</button>`}</div></li>`).join('');
}
$('adminList').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-rm]'); if (!b || !confirm('Cabut akses admin akun ini? Akunnya tetap ada.')) return;
  const { error } = await sb.rpc('remove_admin', { p_user_id: b.dataset.rm });
  if (error) alert(`Gagal: ${error.message}`); else loadAdmins();
});
$('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('newEmail').value.trim(), password = $('newPass').value;
  $('userBtn').disabled = true; say('userMsg', 'Membuat akun…');
  try {
    // Klien terpisah agar admin yang sedang login tidak ikut berganti akun.
    const tmp = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await tmp.auth.signUp({ email, password });
    if (error) throw error;
    const existed = data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
    if ($('newIsAdmin').checked) {
      const { error: e2 } = await sb.rpc('add_admin_by_email', { p_email: email });
      if (e2) throw e2;
    }
    say('userMsg', existed ? 'Email itu sudah terdaftar (kata sandi tidak diubah).'
      : `Akun ${email} dibuat${$('newIsAdmin').checked ? ' dan dijadikan admin' : ''}.${data.session ? '' : ' Jika konfirmasi email aktif di Supabase, orangnya harus klik tautan konfirmasi di emailnya dulu.'}`);
    $('userForm').reset(); $('newIsAdmin').checked = true; loadAdmins();
  } catch (err) {
    say('userMsg', /rate limit/i.test(err.message) ? 'Batas pengiriman email Supabase tercapai. Matikan “Confirm email” (lihat README.md) atau tunggu sebentar.' : `Gagal: ${err.message}`);
  } finally { $('userBtn').disabled = false; }
});

syncMode();
