# Aturan Firestore untuk Sorotan & Musik

Fitur **Sorotan** dan **Musik Latar** menyimpan data di dua dokumen baru pada koleksi `pengurus`:

- `pengurus/sorotan`
- `pengurus/musik`

Pengunjung hanya **membaca**, admin yang login **menulis** (sama seperti `pengurus/kegiatan` dan `pengurus/kepengurusan`).

## Jika aturanmu sudah berbentuk per-koleksi
Contoh yang sudah cukup, tidak perlu diubah:

```
match /pengurus/{dokumen} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

## Jika aturanmu menyebut dokumen satu per satu
Tambahkan dua dokumen ini di Firebase Console → Firestore Database → Rules, lalu **Publish**:

```
match /pengurus/sorotan { allow read: if true; allow write: if request.auth != null; }
match /pengurus/musik   { allow read: if true; allow write: if request.auth != null; }
```

Tanda aturan belum cocok: saat menyimpan di halaman admin muncul pesan "Firestore menolak penyimpanan".
