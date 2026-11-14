# TicketForge AI — Spesifikasi Pembuatan Frontend

Dokumen ini menjadi panduan kerja untuk mulai membangun frontend Angular terhadap backend yang tersedia. Fokus tahap awal adalah autentikasi, profil, dan kerangka aplikasi. Jangan membangun integrasi API untuk fitur yang backend-nya belum ada.

> [!IMPORTANT]
> Frontend Angular belum diasumsikan sudah dibuat. Panduan ini menetapkan rancangan awal yang dapat disesuaikan. Kontrak endpoint terperinci ada di [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md).

## 1. Batasan fitur berdasarkan backend

| Area | Status backend | Yang dikerjakan di FE sekarang |
|---|---|---|
| Health check | Tersedia: `GET /health` | Indikator koneksi/dev diagnostics opsional |
| Register, login, logout, refresh, sesi saat ini | Tersedia | Implementasikan penuh |
| Ubah nama dan password | Tersedia | Implementasikan di halaman profil/keamanan |
| Organisasi/anggota, tiket, QR, upload, import/export | Belum ada endpoint | Placeholder bertanda “Belum tersedia” |
| CRUD desain tiket dan AI draft generator | Tersedia sekarang; lihat [DESIGN_API.md](./DESIGN_API.md) | Implementasikan editor FE; hasil generator adalah config draft yang pengguna edit sebelum simpan |

Base URL lokal API: `http://localhost:3000/api/v1`. Port API bukan port MySQL. Gunakan konfigurasi environment, jangan menulis URL berulang di komponen.

## 2. Rancangan aplikasi awal

Gunakan Angular standalone components dan feature-based structure. Angular CLI versi terbaru yang dipilih tim dapat digunakan; sesuaikan detail bootstrap dengan versi yang terpasang.

```text
src/app/
  core/
    api/                 # konfigurasi API, tipe respons
    auth/                # AuthApi, AuthState, guard, interceptor
    layout/              # app shell, header, navigation
  features/
    auth/                 # login, register
    dashboard/            # ringkasan awal / status fitur
    profile/              # profil dan ganti password
    not-found/
  shared/                 # komponen, validasi, utilitas bersama
  app.routes.ts
  app.config.ts
src/environments/
  environment.ts
  environment.development.ts
```

Atur `apiBaseUrl` di environment development ke `http://localhost:3000/api/v1`; jangan memasukkan secret ke environment FE karena nilainya dibundel ke browser.

### Rute yang disarankan

| Rute | Akses | Halaman |
|---|---|---|
| `/login` | Publik | Form login |
| `/register` | Publik | Form pembuatan akun |
| `/app` | Terproteksi | Shell aplikasi dan landing/dashboard sederhana |
| `/app/profile` | Terproteksi | Ubah nama, tampilkan email/role, ganti password |
| `/**` | Publik | 404 atau redirect yang sesuai |

Jika pengunjung belum login membuka `/app`, arahkan ke `/login`. Jika sudah login membuka `/login` atau `/register`, arahkan ke `/app`. Guard hanya untuk pengalaman navigasi; otorisasi tetap tanggung jawab backend.

### Halaman dan komponen

- **Login**: email, password, validasi wajib, tombol submit/loading, pesan kesalahan umum. Sediakan tautan register.
- **Register**: nama (2–120 karakter), email valid, password 12–128 karakter; konfirmasi password boleh divalidasi lokal saja dan jangan dikirim kecuali kontrak API berubah.
- **App shell**: navigasi, nama pengguna, tombol logout, area konten responsif.
- **Dashboard awal**: sapaan dan kartu status fitur. Untuk area yang belum punya API, tampilkan placeholder “Segera tersedia”, bukan metrik palsu.
- **Profil**: nama dapat diperbarui; email/role tampil sebagai read-only. Form password memakai password saat ini dan password baru minimal 12 karakter. Beri tahu bahwa semua sesi dicabut dan pengguna harus login kembali setelah password berhasil diganti.
- Semua halaman harus memiliki state loading, sukses, error, dan validasi yang dapat diakses (label, fokus, pesan yang terkait dengan field).

Visual starter tidak dibatasi: pilih desain sederhana, konsisten, responsive, dengan kontras yang memadai. Pisahkan token warna/spacing agar mudah diganti setelah keputusan branding.

## 3. Integrasi API dan autentikasi

Endpoint saat ini relatif terhadap `apiBaseUrl`:

- `POST /auth/register` — `{ name, email, password }`
- `POST /auth/login` — `{ email, password }`
- `POST /auth/logout` — body `{}`
- `POST /auth/refresh` — body `{}`
- `GET /auth/me`
- `PATCH /auth/profile` — `{ name }`
- `PATCH /auth/password` — `{ currentPassword, newPassword }`
- `GET /health`

Buat satu `AuthApi`/`ProfileApi` berbasis Angular `HttpClient` dengan tipe request/response. Atur `withCredentials: true` di semua request auth, termasuk `me` dan profile. Cookie access/refresh adalah **HttpOnly**: jangan membaca token, jangan menggunakan header Bearer, dan jangan simpan token/password di `localStorage`, `sessionStorage`, log, atau state persisten.

Alur bootstrap:

1. Saat aplikasi dimulai, panggil `GET /auth/me` dengan credentials.
2. Jika sukses, simpan hanya profil non-rahasia dalam state memori.
3. Jika `401`, anggap belum login dan tampilkan halaman publik.
4. Untuk request terautentikasi yang mendapat `401`, lakukan paling banyak satu `POST /auth/refresh`, lalu ulangi request asal maksimal sekali. Tandai request refresh agar tidak memicu refresh rekursif; bila gagal, kosongkan state dan arahkan ke login.
5. Logout memanggil endpoint logout, lalu selalu bersihkan state FE. Tangani kegagalan jaringan dengan tetap membersihkan state lokal.

API memakai envelope JSON `success`, `message`, `data` (dan kadang `errors`/`meta`). Periksa status HTTP dan jangan mengasumsikan body error selalu memiliki bentuk yang sama. Detail payload dan status code ada di [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md).

## 4. CORS dan cookie: prasyarat penting

Angular dev server biasanya berjalan di `http://localhost:4200`, sedangkan API di `http://localhost:3000`. Backend `src/proxy.ts` mengizinkan origin `http://localhost:4200`, menjawab preflight `OPTIONS`, serta menambahkan credentials headers pada respons API, termasuk respons `401` dari proxy. Jika port/origin FE berbeda, tambahkan origin eksplisit ke allowlist backend. Jangan gunakan `Access-Control-Allow-Origin: *` bersama credentials.

Pastikan frontend mengirim `withCredentials: true`. Perhatikan aturan cookie `SameSite`/`Secure` dan gunakan hostname konsisten (`localhost`, jangan dicampur dengan `127.0.0.1`); production wajib HTTPS. Setelah mengubah backend, restart server Next.js lalu uji kembali melalui browser.

## 5. State dan penanganan error

Simpan state auth minimal: `user | null`, `status` (`loading`, `authenticated`, `anonymous`), dan pesan error yang sedang ditampilkan. Jangan menyimpan kredensial atau token. Hindari dua pemanggilan refresh bersamaan (gunakan satu refresh in-flight yang dibagi ke request lain).

Pemetaan UX yang disarankan:

- `400`/`422`: tampilkan validasi yang relevan; jika detail field tidak tersedia, tampilkan `message`.
- `401`: kredensial salah atau sesi berakhir; jangan ungkapkan apakah email tertentu terdaftar.
- `409`: email sudah digunakan, beri saran login.
- `5xx`/network/CORS: pesan gangguan layanan yang dapat dicoba ulang; jangan tampilkan stack trace.
- cegah submit berulang saat request berlangsung; pertahankan input non-rahasia bila aman.

## 6. Urutan implementasi yang bisa langsung diikuti

1. Buat proyek Angular baru (jika belum ada) dan aktifkan routing serta `HttpClient`.
2. Tambahkan environment API base URL dan tipe `ApiResponse`, `User`, serta payload sesuai kontrak.
3. Implementasikan `AuthApi` dan `ProfileApi`; semua request cookie memakai `withCredentials`.
4. Bangun login/register beserta validasi dan state request.
5. Bangun auth state, bootstrap `GET /auth/me`, guard, dan interceptor/strategi refresh satu kali.
6. Buat app shell, dashboard placeholder yang jujur, dan logout.
7. Buat halaman profil dan ganti password; tangani sesi yang dicabut setelah password berubah.
8. Minta/implementasikan konfigurasi CORS backend untuk origin FE development, lalu uji melalui browser.
9. Jalankan build/lint/test; uji seluruh alur dan dokumentasikan variabel environment.
10. Baru tambahkan menu/fitur lain setelah endpoint backend terkait tersedia dan kontraknya disepakati.

## 7. Kriteria selesai tahap pertama

- Pengguna dapat register dan login; kesalahan validasi/duplikasi ditampilkan dengan jelas.
- Refresh halaman mempertahankan sesi melalui cookie dan `GET /auth/me`, tanpa token di browser storage.
- Route `/app` terlindungi di sisi UI; logout membersihkan sesi/state.
- Pengguna dapat memperbarui nama dan mengganti password sesuai kontrak.
- Kegagalan API/CORS tampil sebagai error yang bisa dipahami.
- Tidak ada data fitur bisnis yang direkayasa seolah berasal dari backend.
- Build dan test Angular berhasil.

## 8. Pengujian yang disarankan

- Unit: validator form, `AuthState`, guard, pemetaan API error, dan aturan refresh maksimal satu kali.
- Service: mock `HttpTestingController`; pastikan URL, method, body, dan `withCredentials` benar.
- UI: login sukses/gagal, register invalid/duplikat, loading/disabled, logout, update profil, password salah/berhasil.
- Integrasi browser: API hidup, CORS allowlist benar, cookie terlihat tersimpan sebagai HttpOnly melalui browser devtools (nilai token tidak perlu dibaca), alur `/me` berjalan setelah reload.
- Uji endpoint secara terpisah di [HOPPSCOTCH_API_TESTING.md](./HOPPSCOTCH_API_TESTING.md) dan koleksi [hoppscotch-collection.json](./hoppscotch-collection.json). Hoppscotch Network Error bisa berbeda dari respons yang terlihat di log server; gunakan uji browser FE untuk memastikan CORS/cookie, dan jangan menganggap log `200` saja membuktikan browser menerima respons.

## Referensi

- [Panduan integrasi API frontend](./FRONTEND_INTEGRATION.md)
- [Dokumentasi backend](./BACKEND_DOCUMENTATION.md)
- [Panduan pengujian Hoppscotch](./HOPPSCOTCH_API_TESTING.md)

