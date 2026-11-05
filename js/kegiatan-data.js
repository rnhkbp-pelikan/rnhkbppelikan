/* Data bawaan & pilihan untuk fitur Kegiatan.
   Dipakai oleh beranda (index.html) dan halaman admin (admin-kegiatan.html). */
window.KEGIATAN_MAKS = 7;

// [kelas ikon Font Awesome, label di menu pilihan]
window.KEGIATAN_IKON = [
  ['fa-music', 'Musik / Koor'], ['fa-hands-praying', 'Doa'], ['fa-campground', 'Retreat / Kemah'],
  ['fa-bus', 'Kunjungan'], ['fa-bullhorn', 'Evangelisasi'], ['fa-hand-holding-heart', 'Bakti sosial'],
  ['fa-star', 'Perayaan'], ['fa-church', 'Ibadah'], ['fa-book-bible', 'Firman / PA'],
  ['fa-guitar', 'Gitar'], ['fa-microphone', 'Mikrofon'], ['fa-handshake', 'Persekutuan'],
  ['fa-users', 'Kebersamaan'], ['fa-utensils', 'Makan bersama'], ['fa-seedling', 'Pembinaan'],
  ['fa-gift', 'Natal'], ['fa-dove', 'Damai'], ['fa-fire', 'Semangat'],
  ['fa-mountain', 'Gunung / Alam'], ['fa-tree', 'Alam']
];

// Pasangan warna gradasi untuk tiap kartu (urut sesuai nomor kegiatan)
window.KEGIATAN_WARNA = [
  ['#2563eb', '#60a5fa'], ['#7c3aed', '#a78bfa'], ['#0d9488', '#2dd4bf'], ['#ea580c', '#fb923c'],
  ['#db2777', '#f472b6'], ['#16a34a', '#4ade80'], ['#ca8a04', '#facc15']
];

// Tampil di beranda selama admin belum menyimpan data sendiri
window.KEGIATAN_DEFAULT = [
  { nama: 'Latihan Koor', ikon: 'fa-music', deskripsi: 'Latihan rutin untuk melayani dengan pujian dan menyiapkan lagu-lagu ibadah.', jadwal: 'Setiap pekan', lokasi: '', foto: '' },
  { nama: 'Partangiangan', ikon: 'fa-hands-praying', deskripsi: 'Persekutuan doa dan firman Tuhan bersama, dari rumah ke rumah.', jadwal: 'Setiap pekan', lokasi: '', foto: '' },
  { nama: 'Retreat', ikon: 'fa-campground', deskripsi: 'Kemah rohani untuk memperdalam iman dan mempererat persaudaraan.', jadwal: 'Setahun sekali', lokasi: '', foto: '' },
  { nama: 'Kunjungan Koor', ikon: 'fa-bus', deskripsi: 'Melayani lewat nyanyian ke gereja dan persekutuan sahabat.', jadwal: 'Sesuai undangan', lokasi: '', foto: '' },
  { nama: 'Evangelisasi', ikon: 'fa-bullhorn', deskripsi: 'Membagikan kabar baik dan kasih Kristus kepada sesama.', jadwal: 'Berkala', lokasi: '', foto: '' },
  { nama: 'Bakti Sosial', ikon: 'fa-hand-holding-heart', deskripsi: 'Berbagi kasih lewat aksi nyata untuk mereka yang membutuhkan.', jadwal: 'Berkala', lokasi: '', foto: '' },
  { nama: 'Natal & Paskah', ikon: 'fa-star', deskripsi: 'Merayakan hari besar gerejawi dengan ibadah dan persekutuan.', jadwal: 'Natal & Paskah', lokasi: '', foto: '' }
];
