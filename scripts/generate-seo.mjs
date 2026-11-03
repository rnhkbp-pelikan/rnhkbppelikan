// Membuat halaman STATIS dari data Firestore + Supabase agar Google bisa membaca isinya
// (nama ketua/bendahara, daftar partitur, artikel, dll). Dijalankan otomatis oleh GitHub Actions
// (.github/workflows/seo.yml); bisa juga dijalankan manual:  node scripts/generate-seo.mjs
//
// Mode uji lokal:  SEO_MOCK=/folder/fixture  (baca JSON dari folder)   |   SEO_OFFLINE=1  (tanpa jaringan)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = process.env.SEO_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOCK = process.env.SEO_MOCK || '';
const OFFLINE = process.env.SEO_OFFLINE === '1';

// kunci ini memang publik (sama dengan yang dipakai di kode situs)
const FIREBASE = { projectId: 'rnhkbp-pelikan', apiKey: 'AIzaSyCwQGsFPBIs_gk0Xc1hscpG-7n6M16gqWc' };
const SUPABASE = { url: 'https://didowuqjuxipzfqdngnq.supabase.co', key: 'sb_publishable_dpLZqudFvFqxtTO8UNjNEg_M9e93YpW' };

// ---------- pemuat modul bersama (skrip klasik berbasis window) ----------
globalThis.window = globalThis;
for (const f of ['js/pengurus-data.js', 'js/kontak-data.js', 'js/seo-render.js']) await import(pathToFileURL(path.join(ROOT, f)).href);
const SEO = globalThis.SEO, KONTAK = globalThis.KONTAK;
const SITE = SEO.SITE;

const log = (...a) => console.log('[seo]', ...a);
const warn = (m) => console.log('::warning::' + m);

// ---------- pengambil data ----------
async function getJson(url, headers) {
  if (OFFLINE) return { ok: false, offline: true };
  const r = await fetch(url, { headers });
  if (r.status === 404) return { ok: false, notFound: true };
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.split('?')[0]);
  return { ok: true, data: await r.json() };
}
function mock(name) {
  const f = path.join(MOCK, name);
  if (!fs.existsSync(f)) return { ok: false, notFound: true };
  return { ok: true, data: JSON.parse(fs.readFileSync(f, 'utf8')) };
}
function dec(v) {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) return decFields(v.mapValue.fields || {});
  return undefined;
}
function decFields(fields) { const o = {}; for (const k of Object.keys(fields || {})) o[k] = dec(fields[k]); return o; }
const fsBase = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;

async function fsDoc(coll, id) {
  try {
    const r = MOCK ? mock(`firestore-${coll}-${id}.json`) : await getJson(`${fsBase}/${coll}/${id}?key=${FIREBASE.apiKey}`);
    return r.ok ? { ok: true, data: decFields(r.data.fields) } : { ok: false, reason: r.notFound ? 'tidak ada' : 'offline' };
  } catch (e) { warn(`Gagal membaca ${coll}/${id}: ${e.message}`); return { ok: false, reason: 'galat', error: true }; }
}
async function fsList(coll, extra = '') {
  try {
    if (MOCK) { const r = mock(`firestore-${coll}.json`); return r.ok ? { ok: true, data: (r.data.documents || []).map((d) => ({ id: d.name.split('/').pop(), ...decFields(d.fields) })) } : { ok: false }; }
    if (OFFLINE) return { ok: false };
    const out = []; let token = '';
    do {
      const r = await getJson(`${fsBase}/${coll}?pageSize=100${extra}${token ? '&pageToken=' + encodeURIComponent(token) : ''}&key=${FIREBASE.apiKey}`);
      if (!r.ok) return { ok: r.notFound, data: out };
      for (const d of r.data.documents || []) out.push({ id: d.name.split('/').pop(), ...decFields(d.fields) });
      token = r.data.nextPageToken || '';
    } while (token);
    return { ok: true, data: out };
  } catch (e) { warn(`Gagal membaca koleksi ${coll}: ${e.message}`); return { ok: false, error: true }; }
}
async function sbLagu() {
  try {
    if (MOCK) { const r = mock('supabase-lagu.json'); return r.ok ? { ok: true, data: r.data } : { ok: false }; }
    if (OFFLINE) return { ok: false };
    const h = { apikey: SUPABASE.key }; if (SUPABASE.key.startsWith('eyJ')) h.Authorization = 'Bearer ' + SUPABASE.key;
    const r = await getJson(`${SUPABASE.url}/rest/v1/lagu?select=*&order=judul.asc`, h);
    return r.ok ? { ok: true, data: r.data } : { ok: false };
  } catch (e) { warn(`Gagal membaca daftar lagu (Supabase): ${e.message}`); return { ok: false, error: true }; }
}

// ---------- bantuan berkas & penanda ----------
const esc = SEO.esc;
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const written = [], unchanged = [];
function wr(f, content) {
  const p = path.join(ROOT, f);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === content) { unchanged.push(f); return; }
  fs.writeFileSync(p, content); written.push(f);
}
function fill(html, name, content) {
  const re = new RegExp(`<!--SEO:${name}-->[\\s\\S]*?<!--/SEO:${name}-->`);
  if (!re.test(html)) throw new Error(`Penanda SEO:${name} tidak ditemukan`);
  return html.replace(re, () => `<!--SEO:${name}-->${content}<!--/SEO:${name}-->`);
}
function setAttr(html, id, attr, value) {
  const re = new RegExp(`(<(?:meta|link)\\b[^>]*\\bid="${id}"[^>]*\\b${attr}=")[^"]*(")`);
  if (!re.test(html)) throw new Error(`Elemen #${id} tidak ditemukan`);
  return html.replace(re, (_, a, b) => a + esc(value) + b);
}
const setTitle = (html, t) => html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(t)}</title>`);
const ld = (arr) => '\n  ' + [].concat(arr).map((o) => SEO.ldTag(o)).join('\n  ') + '\n  ';
const dateOnly = (v) => { const i = SEO.iso(v); return i ? i.slice(0, 10) : ''; };

// ================= 1. DATA =================
const kontakR = await fsDoc('pengurus', 'kontak');
const KONT = KONTAK.gabung(kontakR.ok ? kontakR.data : {});
const pengR = await fsDoc('pengurus', 'kepengurusan');
const artR = await fsList('artikel', '&orderBy=tanggal%20desc');
const laguR = await sbLagu();
log(`kontak:${kontakR.ok ? 'ok' : kontakR.reason} | kepengurusan:${pengR.ok ? 'ok' : pengR.reason} | artikel:${artR.ok ? artR.data.length : 'gagal'} | lagu:${laguR.ok ? laguR.data.length : 'gagal'}`);

const items = pengR.ok ? SEO.pengurusItems(pengR.data, globalThis.PENGURUS_GROUPS) : [];
const sitemap = [{ loc: SITE, pri: '1.0' }, { loc: SITE + 'kepengurusan.html', pri: '0.9' }, { loc: SITE + 'dokumentasi-publik.html', pri: '0.9' }, { loc: SITE + 'partitur.html', pri: '0.9' }];

// ================= 2. KEPENGURUSAN =================
{
  let h = rd('kepengurusan.html');
  const ld2 = pengR.ok ? SEO.pengurusLD(items, KONT) : [SEO.orgLD(KONT), SEO.websiteLD(), SEO.breadcrumbLD([['Beranda', SITE], ['Kepengurusan', SITE + 'kepengurusan.html']])];
  h = fill(h, 'LD', ld(ld2));
  if (pengR.ok) {
    h = fill(h, 'BODY', SEO.pengurusHTML(pengR.data, globalThis.PENGURUS_GROUPS, globalThis.PENGURUS_WARNA));
    const pick = (k) => items.find((p) => p.key === k && p.nama);
    const bag = [['ketua', 'Ketua'], ['sekretaris', 'Sekretaris'], ['bendahara', 'Bendahara']].map(([k, l]) => pick(k) ? `${l}: ${pick(k).nama}` : '').filter(Boolean);
    const desc = (bag.length ? `Pengurus Naposobulung HKBP Pelikan (R-NHKBP Pelikan), Medan. ${bag.join(', ')}. ` : 'Susunan pengurus Naposobulung HKBP Pelikan (R-NHKBP Pelikan), Medan. ') +
      'Lengkap dengan seksi, Parguru Malua, dan Paniroi Naposobulung.';
    h = setAttr(h, 'seoDesc', 'content', desc); h = setAttr(h, 'seoOgDesc', 'content', desc);
  }
  wr('kepengurusan.html', h);
}

// ================= 3. BERANDA (data terstruktur) =================
{
  let h = rd('index.html');
  const org = pengR.ok ? SEO.pengurusLD(items, KONT)[0] : SEO.orgLD(KONT);
  h = fill(h, 'LD', ld([org, SEO.websiteLD()]));
  wr('index.html', h);
}

// ================= 4. ARTIKEL / DOKUMENTASI =================
let artikel = [];
if (artR.ok) {
  artikel = artR.data.filter((a) => a.judul);
  artikel.sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));
  const tpl = rd('detail-artikel-publik.html');
  const keep = new Set();
  for (const a of artikel) {
    const slug = SEO.slugArtikel(a), url = SITE + 'artikel/' + slug + '.html', m = SEO.artikelMeta(a);
    let h = tpl;
    h = fill(h, 'BASE', '<base href="../">');
    h = setTitle(h, m.title);
    h = setAttr(h, 'seoDesc', 'content', m.desc); h = setAttr(h, 'seoCanon', 'href', url); h = setAttr(h, 'seoRobots', 'content', 'index,follow,max-image-preview:large');
    h = setAttr(h, 'seoOgTitle', 'content', m.title); h = setAttr(h, 'seoOgDesc', 'content', m.desc); h = setAttr(h, 'seoOgUrl', 'content', url);
    h = setAttr(h, 'seoOgImage', 'content', a.foto ? SEO.fotoUrl(a.foto, 1200) : SITE + 'logo.png');
    h = fill(h, 'ID', `<script>window.ARTIKEL_ID=${JSON.stringify(a.id)};</script>`);
    h = fill(h, 'LD', ld(SEO.artikelLD(a)));
    h = fill(h, 'BODY', SEO.artikelHTML(a, { liked: false, shareUrl: url }));
    const swap = (from, to) => { if (!h.includes(from)) throw new Error('Pola tidak ditemukan: ' + from); h = h.replace(from, to); };
    swap('<article id="detailArtikel" class="dt-article" style="display:none">', '<article id="detailArtikel" class="dt-article">');
    swap('<div id="loadingSpinner" class="text-center py-5">', '<div id="loadingSpinner" class="text-center py-5" style="display:none">');
    swap('<section id="commentsSection" class="dt-comments" style="display:none"', '<section id="commentsSection" class="dt-comments"');
    swap('<div class="dt-backrow" id="backRow" style="display:none">', '<div class="dt-backrow" id="backRow">');
    swap('<span id="crumbKat">Artikel</span>', `<span id="crumbKat">${esc(a.kategori || 'Artikel')}</span>`);
    wr(`artikel/${slug}.html`, h); keep.add(`${slug}.html`);
    sitemap.push({ loc: url, pri: '0.7', last: dateOnly(a.tanggal) });
  }
  // hapus halaman artikel yang sudah dihapus admin
  const dir = path.join(ROOT, 'artikel');
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.html') && !keep.has(f)) { fs.unlinkSync(path.join(dir, f)); written.push('(hapus) artikel/' + f); }

  // daftar di halaman Dokumentasi
  let d = rd('dokumentasi-publik.html');
  const first = artikel.slice(0, 7);
  d = fill(d, 'FEATURED', first.length ? SEO.artikelUtama(first[0]) : '');
  d = fill(d, 'LIST', first.slice(1).map((a) => SEO.artikelKartu(a, 0)).join(''));
  d = fill(d, 'ARSIP', artikel.map((a) => `<li><a href="${SEO.urlArtikel(a)}">${esc(a.judul)}</a>${a.kategori ? `<span>${esc(a.kategori)}</span>` : ''}</li>`).join(''));
  d = d.replace('<section class="container dk-arsip" id="dkArsip" style="display:none">', '<section class="container dk-arsip" id="dkArsip">');
  if (first.length) d = d.replace(/<div id="skeletonContainer" class="dk-grid"[^>]*>/, (t) => t.includes('display:none') ? t : t.replace('<div id="skeletonContainer"', '<div id="skeletonContainer" style="display:none"'));
  d = fill(d, 'LD', ld([SEO.websiteLD(), SEO.breadcrumbLD([['Beranda', SITE], ['Dokumentasi', SITE + 'dokumentasi-publik.html']]),
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Dokumentasi Kegiatan Naposobulung HKBP Pelikan', url: SITE + 'dokumentasi-publik.html', inLanguage: 'id',
      mainEntity: { '@type': 'ItemList', itemListElement: artikel.slice(0, 50).map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: SEO.urlArtikel(a, true), name: a.judul })) } }]));
  wr('dokumentasi-publik.html', d);
} else warn('Artikel tidak dapat dibaca; halaman artikel dibiarkan seperti sebelumnya.');

// ================= 5. PARTITUR (per lagu) =================
if (laguR.ok) {
  const lagu = laguR.data.filter((l) => l.judul && SEO.driveId(l.pdf_url)).sort((a, b) => String(a.judul).localeCompare(String(b.judul), 'id'));
  const tpl = rd('lagu.html'), keep = new Set();
  for (const l of lagu) {
    const slug = SEO.slugLagu(l), url = SITE + 'lagu/' + slug + '.html', m = SEO.laguMeta(l), id = SEO.driveId(l.pdf_url);
    const terkait = lagu.filter((x) => x.id !== l.id && x.kategori === l.kategori).concat(lagu.filter((x) => x.id !== l.id && x.kategori !== l.kategori));
    let h = tpl;
    h = fill(h, 'BASE', '<base href="../">');
    h = setTitle(h, m.title);
    h = setAttr(h, 'seoDesc', 'content', m.desc); h = setAttr(h, 'seoCanon', 'href', url); h = setAttr(h, 'seoRobots', 'content', 'index,follow,max-image-preview:large');
    h = setAttr(h, 'seoOgTitle', 'content', m.title); h = setAttr(h, 'seoOgDesc', 'content', m.desc); h = setAttr(h, 'seoOgUrl', 'content', url);
    h = setAttr(h, 'seoOgImage', 'content', SEO.driveThumb(id, 1000));
    h = fill(h, 'ID', `<script>window.LAGU_ID=${JSON.stringify(l.id)};</script>`);
    h = fill(h, 'LD', ld(SEO.laguLD(l)));
    h = fill(h, 'BODY', SEO.laguHTML(l, terkait));
    wr(`lagu/${slug}.html`, h); keep.add(`${slug}.html`);
    sitemap.push({ loc: url, pri: '0.6', last: dateOnly(l.created_at) });
  }
  const dir = path.join(ROOT, 'lagu');
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.html') && !keep.has(f)) { fs.unlinkSync(path.join(dir, f)); written.push('(hapus) lagu/' + f); }

  let p = rd('partitur.html');
  p = fill(p, 'LIST', lagu.length ? `<ul class="seo-list">${lagu.map((l) => `<li><a href="${SEO.urlLagu(l)}">${esc(l.judul)}</a>${l.pencipta ? ` <span>· ${esc(l.pencipta)}</span>` : ''}</li>`).join('')}</ul>` : '');
  p = fill(p, 'LD', ld([SEO.websiteLD(), SEO.breadcrumbLD([['Beranda', SITE], ['Partitur', SITE + 'partitur.html']]),
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Koleksi Partitur Lagu R-NHKBP Pelikan', url: SITE + 'partitur.html', inLanguage: 'id',
      mainEntity: { '@type': 'ItemList', itemListElement: lagu.slice(0, 200).map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: SEO.urlLagu(l, true), name: 'Partitur ' + l.judul })) } }]));
  wr('partitur.html', p);
} else warn('Daftar lagu (Supabase) tidak dapat dibaca; halaman partitur dibiarkan seperti sebelumnya.');

// ================= 6. SITEMAP =================
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemap.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.last ? `<lastmod>${u.last}</lastmod>` : ''}<priority>${u.pri}</priority></url>`).join('\n') + '\n</urlset>\n';
wr('sitemap.xml', xml);

log(`selesai: ${written.length} berkas diperbarui, ${unchanged.length} tidak berubah.`);
for (const f of written.slice(0, 40)) log('  ✎', f);
