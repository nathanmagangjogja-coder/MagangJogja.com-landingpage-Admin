# TEST LOKAL

## Jalankan
Buka Terminal/PowerShell di folder proyek:

npm install
npm run dev

## Buka
Website:
http://127.0.0.1:3000/

Admin:
http://127.0.0.1:3000/admin

Password default lokal:
magang2026

## Data lokal
Perubahan dari admin disimpan di:
.local-data/content.json

Data ini hanya untuk pengujian lokal dan tidak digunakan saat production.

## Setelah testing
File production Vercel dan Supabase tetap ada. Server lokal hanya meniru endpoint:
- /api/auth
- /api/content

Jadi Anda bisa menguji login, edit, simpan, refresh, dan sinkronisasi website sebelum deploy.

## Test Riwayat Perubahan

1. Login admin tanpa mengubah apa pun lalu klik **Simpan Perubahan** → tidak ada histori baru.
2. Ubah logo → tersimpan satu histori dengan detail sebelum/sesudah.
3. Ubah formasi → tersimpan satu histori dengan detail sebelum/sesudah.
4. Ubah fasilitas → tersimpan satu histori dengan detail sebelum/sesudah.
5. Ubah logo + formasi + fasilitas dalam satu Save → satu histori dengan `section: multiple`.
6. Klik Reset ketika content berbeda dari default → satu histori `reset`.
7. Restart server → `.local-data/history.json` tetap menyimpan histori.
8. Refresh `/admin` → histori tetap tersedia.
9. Tanpa sesi admin, `GET /api/history` → `401`.
10. Production menggunakan tabel `magangjogja_history` di Supabase.
