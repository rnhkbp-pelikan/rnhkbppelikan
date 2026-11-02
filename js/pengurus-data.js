/* Susunan kepengurusan — dipakai beranda (index.html) dan admin-kepengurusan.html.
   Kunci (key) sama dengan field di Firestore: pengurus/kepengurusan
     <key>          = nama orang
     <key>_label    = nama jabatan / nama seksi (bisa diedit)
     <key>_kontak   = nomor WhatsApp
     <key>_bio      = bio singkat
     <key>_foto     = alamat foto                                         */
(function () {
  var seksi = ['Koor & Musik', 'Perlengkapan', 'Konsumsi', 'Dokumentasi', 'Kebersihan',
    'Acara & Kreatif', 'Humas', 'Kerohanian', 'Diakonia & Sosial', 'Olahraga & Seni'];
  window.PENGURUS_GROUPS = [
    { id: 'inti', judul: 'Inti Pengurus', ikon: 'fa-user-tie', items: [
      { key: 'ketua', label: 'Ketua Naposobulung', ikon: 'fa-user-tie' },
      { key: 'sekretaris', label: 'Sekretaris', ikon: 'fa-file-signature' },
      { key: 'bendahara', label: 'Bendahara', ikon: 'fa-coins' }
    ] },
    { id: 'seksi', judul: 'Seksi Naposobulung', ikon: 'fa-users', note: 'Tersedia 10 seksi. Nama seksi bisa diubah; seksi yang namanya dikosongkan tidak ditampilkan.',
      items: seksi.map(function (nama, i) { return { key: 'seksi' + (i + 1), label: nama, badge: 'Seksi ' + (i + 1), ikon: 'fa-user' }; }) },
    { id: 'pembina', judul: 'Pembina', ikon: 'fa-chalkboard-user', items: [
      { key: 'parguru', label: 'Parguru Malua', ikon: 'fa-chalkboard-user' },
      { key: 'inang', label: 'Paniroi Naposobulung', ikon: 'fa-hands-helping' }
    ] }
  ];
  // pasangan warna gradasi untuk avatar inisial bila belum ada foto
  window.PENGURUS_WARNA = [['#2563eb', '#60a5fa'], ['#7c3aed', '#a78bfa'], ['#0d9488', '#2dd4bf'], ['#ea580c', '#fb923c'],
    ['#db2777', '#f472b6'], ['#16a34a', '#4ade80'], ['#ca8a04', '#facc15']];
  // 0813-6085-6654 -> 6281360856654 (untuk tautan WhatsApp)
  window.waNomor = function (n) {
    var d = String(n || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.indexOf('62') === 0) return d;
    if (d.charAt(0) === '0') return '62' + d.slice(1);
    return '62' + d;
  };
})();
