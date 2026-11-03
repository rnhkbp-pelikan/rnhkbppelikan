/* Pembuat HTML & data terstruktur untuk SEO.
   Dipakai OLEH BROWSER (halaman hidup) dan OLEH scripts/generate-seo.mjs (halaman statis untuk Google),
   sehingga isi yang dilihat Google sama dengan yang dilihat pengunjung. */
(function (root) {
  var SITE = 'https://rnhkbp-pelikan.github.io/rnhkbppelikan/';
  var NAMA = 'R-NHKBP Pelikan';
  var NAMA_PANJANG = 'R-NHKBP Pelikan (Naposobulung HKBP Ressort Pelikan Raya, Medan)';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function slugify(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' dan ')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  }
  function kode(id) { return String(id || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toLowerCase(); }
  function slugLagu(l) { return (slugify(l.judul) || 'lagu') + '-' + kode(l.id); }
  function slugArtikel(a) { return (slugify(a.judul) || 'artikel') + '-' + kode(a.id); }
  function urlLagu(l, abs) { return (abs ? SITE : '') + 'lagu/' + slugLagu(l) + '.html'; }
  function urlArtikel(a, abs) { return (abs ? SITE : '') + 'artikel/' + slugArtikel(a) + '.html'; }

  function potong(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }
  function plain(html) { return String(html || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
  function fotoUrl(u, w) {
    return (u && u.indexOf('res.cloudinary.com') > -1 && u.indexOf('/upload/') > -1 && !/\/upload\/[a-z]_/.test(u))
      ? u.replace('/upload/', '/upload/c_limit,w_' + w + ',f_auto,q_auto/') : u;
  }

  /* ---------- Google Drive ---------- */
  function driveId(url) { var m = /\/d\/([\w-]+)/.exec(url || '') || /[?&]id=([\w-]+)/.exec(url || ''); return m ? m[1] : ''; }
  function drivePreview(id) { return 'https://drive.google.com/file/d/' + id + '/preview'; }
  function driveView(id) { return 'https://drive.google.com/file/d/' + id + '/view'; }
  function driveDownload(id) { return 'https://drive.google.com/uc?export=download&id=' + id; }
  function driveThumb(id, w) { return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + (w || 1000); }

  /* ================= KEPENGURUSAN ================= */
  function pengurusItems(d, groups) {
    var out = [];
    groups.forEach(function (g) {
      g.items.forEach(function (it) {
        var label = d[it.key + '_label'] !== undefined ? d[it.key + '_label'] : it.label;
        if (!String(label).trim()) return;                       // seksi yang dikosongkan tidak ditampilkan
        out.push({ grup: g.id, key: it.key, label: String(label).trim(), nama: String(d[it.key] || '').trim(),
          bio: String(d[it.key + '_bio'] || '').trim(), foto: String(d[it.key + '_foto'] || '').trim(), badge: it.badge || '', ikon: it.ikon || 'fa-user' });
      });
    });
    return out;
  }
  function kartuPengurus(p, i, warna) {
    var w = warna[i % warna.length];
    var judul = p.nama ? p.label + ' – ' + p.nama : p.label;
    var foto = p.foto
      ? '<div class="pg-photo ph"><img class="ph-bd" src="' + esc(fotoUrl(p.foto, 480)) + '" alt="" aria-hidden="true" loading="lazy">' +
        '<img class="ph-main" src="' + esc(fotoUrl(p.foto, 480)) + '" alt="' + esc(judul + ' R-NHKBP Pelikan') + '" loading="lazy"></div>'
      : '<div class="pg-ava">' + (p.nama ? '<b>' + esc(p.nama.charAt(0).toUpperCase()) + '</b>' : '<i class="fas ' + esc(p.ikon) + '"></i>') + '</div>';
    return '<article class="pg-card kp-card" style="--c1:' + w[0] + ';--c2:' + w[1] + '">' + foto +
      '<div class="pg-body">' + (p.badge ? '<span class="pg-badge">' + esc(p.badge) + '</span>' : '') +
      '<h3 class="pg-role">' + esc(p.label) + '</h3>' +
      '<p class="pg-name' + (p.nama ? '' : ' none') + '">' + (p.nama ? esc(p.nama) : 'Belum ditentukan') + '</p>' +
      (p.bio ? '<p class="kp-bio">' + esc(p.bio) + '</p>' : '') + '</div></article>';
  }
  function faqDaftar(items) {
    var q = [], seksi = [];
    items.forEach(function (p) {
      if (!p.nama) return;
      if (p.grup === 'seksi') { seksi.push(p.badge + ' ' + p.label + ': ' + p.nama); return; }
      var jab = /naposobulung|parguru|paniroi/i.test(p.label) ? p.label : p.label + ' Naposobulung';
      q.push({ q: 'Siapa ' + jab + ' HKBP Pelikan?', a: p.label + ' R-NHKBP Pelikan (Naposobulung HKBP Ressort Pelikan Raya) adalah ' + p.nama + '.' + (p.bio ? ' ' + p.bio : '') });
    });
    if (seksi.length) q.push({ q: 'Siapa saja pengurus seksi Naposobulung HKBP Pelikan?', a: seksi.join('; ') + '.' });
    return q;
  }
  function pengurusHTML(d, groups, warna) {
    var items = pengurusItems(d, groups), n = 0, html = '';
    var judul = { inti: 'Inti Pengurus Naposobulung HKBP Pelikan', pembina: 'Pembina: Parguru Malua & Paniroi Naposobulung' };
    var kolom = { inti: 'pg-3', seksi: 'pg-5', pembina: 'pg-2' };
    groups.forEach(function (g) {
      var ada = items.filter(function (p) { return p.grup === g.id; });
      if (!ada.length) return;
      var t = g.id === 'seksi' ? ada.length + ' Seksi Naposobulung HKBP Pelikan' : judul[g.id];
      html += '<section class="kp-group" aria-labelledby="kp-' + g.id + '"><h2 class="pg-sub" id="kp-' + g.id + '">' + esc(t) + '</h2><div class="pg-list ' + kolom[g.id] + '">' +
        ada.map(function (p) { return kartuPengurus(p, n++, warna); }).join('') + '</div></section>';
    });
    var faq = faqDaftar(items);
    if (faq.length) {
      html += '<section class="kp-faq" aria-labelledby="kp-faq-h"><h2 class="pg-sub" id="kp-faq-h">Pertanyaan yang sering dicari</h2><dl>' +
        faq.map(function (x) { return '<div class="kp-q"><dt>' + esc(x.q) + '</dt><dd>' + esc(x.a) + '</dd></div>'; }).join('') + '</dl></section>';
    }
    return html;
  }

  /* ================= DATA TERSTRUKTUR (JSON-LD) ================= */
  function orgLD(k) {
    var wa = String(k.telepon || '').replace(/\D/g, ''); if (wa.charAt(0) === '0') wa = '62' + wa.slice(1);
    var ig = /^https?:/i.test(k.instagram || '') ? k.instagram : 'https://www.instagram.com/' + String(k.instagram || '').replace(/^@/, '');
    return { '@context': 'https://schema.org', '@type': 'Organization', '@id': SITE + '#org', name: NAMA_PANJANG,
      alternateName: ['R-NHKBP Pelikan', 'NHKBP Pelikan', 'Naposobulung HKBP Pelikan', 'Naposo HKBP Ressort Pelikan Raya'],
      url: SITE, logo: SITE + 'logo.png',
      description: 'Website resmi R-NHKBP Pelikan, persekutuan Naposobulung dan Parguru Malua HKBP Ressort Pelikan Raya, Medan: kepengurusan, kegiatan, dokumentasi, renungan, dan partitur lagu.',
      address: { '@type': 'PostalAddress', streetAddress: k.alamat, addressLocality: 'Medan', addressRegion: 'Sumatera Utara', addressCountry: 'ID' },
      telephone: wa ? '+' + wa : undefined, email: k.email, hasMap: k.mapsUrl, sameAs: [ig] };
  }
  function websiteLD() { return { '@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE + '#web', url: SITE, name: NAMA, inLanguage: 'id', publisher: { '@id': SITE + '#org' } }; }
  function breadcrumbLD(list) {
    return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(function (x, i) { return { '@type': 'ListItem', position: i + 1, name: x[0], item: x[1] }; }) };
  }
  function pengurusLD(items, k) {
    var org = orgLD(k);
    org.member = items.filter(function (p) { return p.nama; }).map(function (p) {
      var o = { '@type': 'Person', name: p.nama, jobTitle: p.label + (p.badge ? ' (' + p.badge + ')' : ''), worksFor: { '@id': SITE + '#org' } };
      if (p.foto) o.image = fotoUrl(p.foto, 600);
      if (p.bio) o.description = p.bio;
      return o;
    });
    var faq = faqDaftar(items);
    var g = [org, websiteLD(), breadcrumbLD([['Beranda', SITE], ['Kepengurusan', SITE + 'kepengurusan.html']])];
    if (faq.length) g.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(function (x) { return { '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } }; }) });
    return g;
  }
  function ldTag(obj) { return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>'; }

  /* ================= PARTITUR (per lagu) ================= */
  function laguMeta(l) {
    var judul = String(l.judul || 'Lagu'), pencipta = String(l.pencipta || '').trim(), kat = String(l.kategori || '').trim();
    return {
      title: 'Partitur ' + judul + (pencipta ? ' – ' + pencipta : '') + ' | Partitur R-NHKBP Pelikan',
      desc: 'Partitur lagu "' + judul + '"' + (pencipta ? ' karya ' + pencipta : '') + (kat ? ' (' + kat + ')' : '') +
        ' dalam format PDF. Lihat dan unduh gratis dari koleksi partitur R-NHKBP Pelikan, Naposobulung HKBP Ressort Pelikan Raya, Medan.'
    };
  }
  function laguHTML(l, terkait) {
    var m = laguMeta(l), id = driveId(l.pdf_url), pencipta = String(l.pencipta || '').trim(), kat = String(l.kategori || '').trim();
    var tgl = '';
    try { if (l.created_at) tgl = new Date(l.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }); } catch (e) {}
    var rel = (terkait || []).slice(0, 8).map(function (x) {
      return '<li><a href="' + urlLagu(x) + '">' + esc(x.judul) + '</a>' + (x.pencipta ? ' <span>· ' + esc(x.pencipta) + '</span>' : '') + '</li>';
    }).join('');
    return '<nav class="lg-crumb" aria-label="Breadcrumb"><a href="index.html">Beranda</a><span>/</span><a href="partitur.html">Partitur</a><span>/</span><span>' + esc(l.judul) + '</span></nav>' +
      '<article class="lg-card">' +
        '<header>' + (kat ? '<span class="lg-chip">' + esc(kat) + '</span>' : '') +
          '<h1>Partitur ' + esc(l.judul) + '</h1>' + (pencipta ? '<p class="lg-by">Pencipta: <b>' + esc(pencipta) + '</b></p>' : '') + '</header>' +
        '<p class="lg-desc">' + esc(m.desc) + (tgl ? ' Ditambahkan ' + esc(tgl) + '.' : '') + '</p>' +
        (id ? '<div class="lg-viewer"><iframe src="' + drivePreview(id) + '" title="Partitur ' + esc(l.judul) + '" loading="lazy" allow="autoplay"></iframe></div>' : '<p class="lg-desc">File partitur belum tersedia.</p>') +
        '<div class="lg-actions">' +
          (id ? '<a class="lg-btn primary" href="' + driveDownload(id) + '" rel="noopener"><i class="fas fa-download"></i> Unduh PDF</a>' +
                '<a class="lg-btn" href="' + driveView(id) + '" target="_blank" rel="noopener"><i class="fas fa-up-right-from-square"></i> Buka di Drive</a>' : '') +
          '<button type="button" class="lg-btn" id="lgShare"><i class="fas fa-share-nodes"></i> Bagikan</button>' +
          '<a class="lg-btn wa" id="lgWa" href="https://wa.me/?text=' + encodeURIComponent('Partitur ' + l.judul + (pencipta ? ' – ' + pencipta : '') + ' ' + urlLagu(l, true)) + '" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>' +
        '</div>' +
      '</article>' +
      (rel ? '<section class="lg-more"><h2>Partitur lainnya</h2><ul>' + rel + '</ul></section>' : '');
  }
  function laguLD(l) {
    var m = laguMeta(l), id = driveId(l.pdf_url), url = urlLagu(l, true);
    var o = { '@context': 'https://schema.org', '@type': 'MusicComposition', name: l.judul, url: url, inLanguage: 'id',
      description: m.desc, isPartOf: { '@type': 'WebSite', '@id': SITE + '#web' }, publisher: { '@id': SITE + '#org' } };
    if (l.pencipta) o.composer = { '@type': 'Person', name: l.pencipta };
    if (l.kategori) o.genre = l.kategori;
    if (id) { o.encoding = { '@type': 'MediaObject', contentUrl: driveView(id), encodingFormat: 'application/pdf' }; o.image = driveThumb(id, 1000); }
    return [o, breadcrumbLD([['Beranda', SITE], ['Partitur', SITE + 'partitur.html'], [l.judul, url]])];
  }

  /* ================= ARTIKEL / DOKUMENTASI ================= */
  var NOIMG = 'data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><rect width='800' height='500' fill='#dbe7ff'/><g fill='#93b4ff'><circle cx='330' cy='210' r='34'/><path d='M200 360l120-130 90 90 70-70 120 110z'/></g><text x='400' y='430' font-family='Arial' font-size='34' text-anchor='middle' fill='#2563eb' opacity='.55'>RNHKBP Pelikan</text></svg>");
  function tgl(v, panjang) {
    try { var d = v && v.toDate ? v.toDate() : (v ? new Date(v) : null);
      if (d && !isNaN(d)) return d.toLocaleDateString('id-ID', { day: 'numeric', month: panjang ? 'long' : 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }); } catch (e) {}
    return '';
  }
  function iso(v) { try { var d = v && v.toDate ? v.toDate() : (v ? new Date(v) : null); return d && !isNaN(d) ? d.toISOString() : undefined; } catch (e) { return undefined; } }
  function catClass(k) { return 'cat-' + String(k || 'lainnya').toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
  function menitBaca(html) { return Math.max(1, Math.ceil(plain(html).split(' ').filter(Boolean).length / 200)); }
  function bersih(h) { return String(h || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, ''); }
  function frImgs(url, alt, w) {
    var src = esc(fotoUrl(url, w) || '');
    return src
      ? '<img class="ph-bd" src="' + src + '" alt="" aria-hidden="true" loading="lazy" onerror="this.remove()"><img class="ph-main" src="' + src + '" alt="' + esc(alt) + '" loading="lazy" onerror="phErr(this)">'
      : '<img class="ph-main" src="' + NOIMG + '" alt="">';
  }
  function artikelKartu(a, delay) {
    var t = tgl(a.tanggal, false), url = urlArtikel(a), ex = plain(a.isi).slice(0, 150);
    return '<article class="dk-card" style="animation-delay:' + (delay || 0) + 'ms">' +
      '<a class="dk-media ph" href="' + url + '" tabindex="-1" aria-hidden="true">' + frImgs(a.foto, '', 720) +
      '<span class="dk-chip ' + catClass(a.kategori) + '">' + esc(a.kategori || 'Umum') + '</span></a>' +
      '<div class="dk-body"><div class="dk-meta">' + (t ? '<span><i class="far fa-calendar"></i>' + esc(t) + '</span>' : '') + '<span><i class="far fa-clock"></i>' + menitBaca(a.isi) + ' mnt baca</span></div>' +
      '<h3><a href="' + url + '">' + esc(a.judul || 'Tanpa judul') + '</a></h3>' +
      '<p>' + esc(ex) + (ex.length >= 150 ? '…' : '') + '</p>' +
      '<div class="dk-foot"><span class="dk-like"><i class="fas fa-heart"></i>' + (a.like || 0) + '</span><a class="dk-more" href="' + url + '">Baca selengkapnya <i class="fas fa-arrow-right"></i></a></div></div></article>';
  }
  function artikelUtama(a) {
    var t = tgl(a.tanggal, true), url = urlArtikel(a), ex = plain(a.isi).slice(0, 260);
    return '<article class="dk-feature"><a class="dk-media ph" href="' + url + '" tabindex="-1" aria-hidden="true">' + frImgs(a.foto, '', 1100) + '</a>' +
      '<div class="dk-body"><span class="dk-new"><i class="fas fa-star"></i> Terbaru</span>' +
      '<div><span class="dk-chip ' + catClass(a.kategori) + '">' + esc(a.kategori || 'Umum') + '</span></div>' +
      '<h3><a href="' + url + '">' + esc(a.judul || 'Tanpa judul') + '</a></h3>' +
      '<div class="dk-meta">' + (t ? '<span><i class="far fa-calendar"></i>' + esc(t) + '</span>' : '') + '<span><i class="far fa-clock"></i>' + menitBaca(a.isi) + ' mnt baca</span><span><i class="fas fa-heart" style="color:#e11d48"></i>' + (a.like || 0) + ' suka</span></div>' +
      '<p>' + esc(ex) + (ex.length >= 260 ? '…' : '') + '</p>' +
      '<div class="dk-foot"><a class="dk-btn" href="' + url + '">Baca artikel <i class="fas fa-arrow-right"></i></a></div></div></article>';
  }
  // isi halaman detail artikel (o.liked = sudah disukai di browser ini)
  function artikelHTML(d, o) {
    o = o || {};
    var judul = d.judul || 'Artikel', t = tgl(d.tanggal, true), share = o.shareUrl || urlArtikel(d, true);
    return '<span class="dk-chip ' + catClass(d.kategori) + '">' + esc(d.kategori || 'Umum') + '</span>' +
      '<h1>' + esc(judul) + '</h1>' +
      '<div class="dt-meta">' + (t ? '<span><i class="far fa-calendar"></i>' + esc(t) + '</span>' : '') +
      '<span><i class="far fa-clock"></i>' + menitBaca(d.isi) + ' menit baca</span>' +
      '<span class="heart"><i class="fas fa-heart"></i><span id="likeCount">' + (d.like || 0) + '</span> suka</span></div>' +
      '<figure class="dt-cover ph nat" style="--ph-max:640px">' + frImgs(d.foto, judul, 1400) + '</figure>' +
      '<div class="dt-content">' + (bersih(d.isi) || '<p>Konten tidak tersedia.</p>') + '</div>' +
      '<div class="dt-actions"><button type="button" class="dt-like' + (o.liked ? ' liked' : '') + '" id="likeButton"><i class="' + (o.liked ? 'fas' : 'far') + ' fa-heart"></i><span id="likeLabel">' + (o.liked ? 'Kamu menyukai ini' : 'Suka artikel ini') + '</span></button>' +
      '<div class="dt-share"><span>Bagikan</span><a href="https://wa.me/?text=' + encodeURIComponent(judul + ' ' + share) + '" target="_blank" rel="noopener" aria-label="Bagikan lewat WhatsApp"><i class="fab fa-whatsapp"></i></a>' +
      '<button type="button" id="copyBtn" aria-label="Salin tautan"><i class="fas fa-link"></i></button></div></div>';
  }
  function artikelMeta(a) {
    var ex = potong(plain(a.isi), 155);
    return { title: (a.judul || 'Artikel') + ' | Dokumentasi R-NHKBP Pelikan', desc: ex || ('Dokumentasi kegiatan ' + (a.kategori || '') + ' R-NHKBP Pelikan, Naposobulung HKBP Ressort Pelikan Raya, Medan.') };
  }
  function artikelLD(a) {
    var url = urlArtikel(a, true), m = artikelMeta(a);
    var o = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: potong(a.judul, 110), description: m.desc, inLanguage: 'id',
      mainEntityOfPage: { '@type': 'WebPage', '@id': url }, url: url, articleSection: a.kategori || undefined,
      datePublished: iso(a.tanggal), dateModified: iso(a.tanggal),
      author: { '@type': 'Organization', name: NAMA, url: SITE }, publisher: { '@type': 'Organization', name: NAMA, logo: { '@type': 'ImageObject', url: SITE + 'logo.png' } } };
    if (a.foto) o.image = [fotoUrl(a.foto, 1200)];
    return [o, breadcrumbLD([['Beranda', SITE], ['Dokumentasi', SITE + 'dokumentasi-publik.html'], [a.judul || 'Artikel', url]])];
  }

  root.SEO = { SITE: SITE, NAMA: NAMA, esc: esc, slugify: slugify, kode: kode, slugLagu: slugLagu, slugArtikel: slugArtikel, urlLagu: urlLagu, urlArtikel: urlArtikel,
    potong: potong, plain: plain, fotoUrl: fotoUrl, driveId: driveId, drivePreview: drivePreview, driveView: driveView, driveDownload: driveDownload, driveThumb: driveThumb,
    pengurusItems: pengurusItems, pengurusHTML: pengurusHTML, faqDaftar: faqDaftar, orgLD: orgLD, websiteLD: websiteLD, breadcrumbLD: breadcrumbLD,
    pengurusLD: pengurusLD, ldTag: ldTag, laguMeta: laguMeta, laguHTML: laguHTML, laguLD: laguLD,
    NOIMG: NOIMG, tgl: tgl, iso: iso, catClass: catClass, menitBaca: menitBaca, bersih: bersih, frImgs: frImgs,
    artikelKartu: artikelKartu, artikelUtama: artikelUtama, artikelHTML: artikelHTML, artikelMeta: artikelMeta, artikelLD: artikelLD };
})(typeof window !== 'undefined' ? window : globalThis);
