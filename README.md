# magangjogja.com — Local + Vercel/Supabase

Project ini mempertahankan `magangjogja.html` sebagai master file. Integrasi admin dilakukan tanpa menulis perubahan permanen ke HTML original.

## Dua mode

### 1. Testing lokal

Persyaratan: Node.js 18+.

```bash
npm install
npm run dev
```

Buka:
- Website: http://127.0.0.1:3000/
- Admin: http://127.0.0.1:3000/admin

Password lokal default: `magang2026`.

Jika `ADMIN_PASSWORD` tersedia, server lokal memakai nilai tersebut. Password hanya untuk testing lokal dan tidak ditampilkan pada website publik.

Data lokal disimpan otomatis di `.local-data/content.json`. Folder tersebut masuk `.gitignore`.

`local-server.js` memakai Node.js native HTTP dan melakukan runtime injection `content.js` hanya pada HTTP response. File `magangjogja.html` di disk tidak ditulis ulang.

### 2. Production Vercel + Supabase

Project yang sama dapat dideploy ke Vercel. `local-server.js` bukan production server Vercel.

1. Buat project Supabase.
2. Jalankan isi `supabase.sql`.
3. Di Vercel, set environment variables:
   - `ADMIN_PASSWORD`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy repository/project ini.
5. Buka `/admin`.
6. Login.
7. Edit Logo, Formasi Magang, dan Fasilitas.
8. Klik Simpan.
9. Refresh website.

`SUPABASE_SERVICE_ROLE_KEY` hanya digunakan server-side pada `/api/content.js`. Jangan memasukkannya ke HTML, `content.js`, atau browser.

## API

- `POST /api/auth` — validasi password.
- `GET /api/content` — membaca content.
- `POST /api/content` — menyimpan content setelah validasi password.
- `DELETE /api/content` — menghapus row `id = 1`, sehingga website kembali menggunakan content default.

Status login:
- `200 {"ok":true}` untuk password benar.
- `401 {"ok":false}` untuk password salah.
- `405` untuk method yang tidak diizinkan.

Error API pada admin dibedakan antara 401, 404, 5xx, dan network error.

## Supabase

Tabel: `magangjogja_content`

- `id int primary key`
- `data jsonb not null`
- `updated_at timestamptz not null default now()`

RLS diaktifkan. Frontend tidak mengakses Supabase secara langsung; seluruh operasi production melewati `/api/content`.

## File penting

```text
magangjogja/
├── magangjogja.html
├── admin.html
├── content.js
├── local-server.js
├── package.json
├── vercel.json
├── middleware.js
├── .env.example
├── .gitignore
├── README.md
├── supabase.sql
├── api/
│   ├── auth.js
│   └── content.js
├── assets/
├── css/
├── js/
└── .local-data/
    └── content.json
```

`.local-data/content.json` dibuat otomatis saat server lokal pertama kali berjalan dan tidak perlu dimasukkan ke ZIP final.

## Validasi final

Sebelum deployment:

1. `npm install`
2. `npm run dev`
3. GET `/` harus 200.
4. GET `/admin` harus 200.
5. POST `/api/auth` dengan password benar harus 200.
6. POST `/api/auth` dengan password salah harus 401.
7. GET `/api/content` harus 200.
8. POST `/api/content` harus menyimpan `.local-data/content.json`.
9. DELETE `/api/content` harus mengembalikan data default.
10. Checksum/byte `magangjogja.html` sebelum dan sesudah server dijalankan harus identik.
11. Asset existing harus tetap dapat diakses.
12. Admin harus dapat mengubah Logo, Formasi Magang, dan Fasilitas.
13. Setelah Save lalu refresh website, perubahan harus tetap tampil.

## Catatan visual

Tidak ada redesign. Layout, ukuran section, grid Elementor, font, warna, spacing, animation, icon, image, SVG, position, alignment, class, ID, dan struktur HTML original tidak diubah oleh integrasi ini. Sinkronisasi posisi menggunakan slot Elementor existing yang sudah tersedia di `content.js`.

## Riwayat Perubahan Admin

Panel `/admin` memiliki **Riwayat Perubahan** sebagai audit trail. Riwayat hanya dibuat ketika perubahan content benar-benar terjadi.

### Local
- File: `.local-data/history.json`
- Dibuat otomatis saat server pertama dijalankan.
- Histori terbaru ditampilkan terlebih dahulu, 20 record per halaman.
- Reset juga dicatat sebagai `action: "reset"` apabila content memang berubah.

### Production
- Tabel: `magangjogja_history`
- Dibuat dengan `supabase.sql` dan RLS aktif.
- Histori dibaca melalui `/api/history` setelah login admin.
- `SUPABASE_SERVICE_ROLE_KEY` tetap server-side dan tidak disimpan dalam histori.
