# TicketForge AI — Tes API dengan Hoppscotch

Panduan ini mencakup endpoint yang benar-benar tersedia saat ini: health check dan autentikasi. CRUD organisasi/anggota/desain, AI, upload, import/export, tiket, dan QR belum tersedia.

## 1. Jalankan backend

Pastikan Laragon MySQL aktif, database `ticketforge_ai` sudah dimigrasi, dan `DATABASE_URL` pada `.env` menunjuk ke MySQL. Di lingkungan project ini, MySQL terdeteksi pada port `3306`.

Buka PowerShell di folder project:

```powershell
cd "D:\project kantor\nyoba"
```

Jika diperlukan, set lokasi Prisma engine di terminal yang sama:

```powershell
$env:PRISMA_QUERY_ENGINE_LIBRARY = "D:\project kantor\nyoba\node_modules\@prisma\engines\query_engine-windows.dll.node"
$env:PRISMA_SCHEMA_ENGINE_BINARY = "D:\project kantor\nyoba\node_modules\@prisma\engines\schema-engine-windows.exe"
```

Jalankan salah satu mode server saja:

```powershell
npm.cmd run dev
```

Atau mode production:

```powershell
npm.cmd run build
npm.cmd run start
```

Gunakan base URL yang ditampilkan terminal; default:

```text
http://localhost:3000/api/v1
```

Jika port 3000 sedang digunakan, hentikan server lama dengan `Ctrl+C` di terminalnya, atau gunakan port lain, misalnya `npm.cmd run dev -- -p 3001` dan base URL `http://localhost:3001/api/v1`.

## 2. Import collection dan environment

File koleksi berisi request beserta method, endpoint, header, dan contoh body JSON:

- [hoppscotch-collection.json](./hoppscotch-collection.json)
- [hoppscotch-environment.json](./hoppscotch-environment.json)

Di Hoppscotch, buka **Collections → Import** dan impor file collection. Lalu buka **Environments → Import** dan impor environment. Pilih environment `TicketForge Local` sebagai active; `baseUrl` sudah diset ke `http://localhost:3000/api/v1`. Kalau server memakai port lain, edit nilai environment `baseUrl` sesuai alamat server.

Body request uji sudah terisi di koleksi, termasuk register dan login dengan akun contoh. Ganti email di body register ke email unik sebelum menjalankan request; password contoh hanya untuk tes lokal. Jalankan request berurutan: Health check, Register, Login, lalu Current user. Request sisanya juga ada dengan body yang diperlukan; endpoint dengan catatan "requires cookie" membutuhkan Hoppscotch menyimpan dan mengirim cookie hasil login.

Jika memakai Hoppscotch web, izinkan browser mengakses localhost saat diminta. Cookie auth/CORS dapat berbeda tergantung cara Hoppscotch dijalankan. Backend starter ini belum mengonfigurasi CORS untuk origin Hoppscotch/Angular eksternal. Jika cookie tidak tersimpan atau request diblokir CORS, gunakan Hoppscotch Desktop/lokal atau client same-origin yang mendukung cookie.

Untuk request dengan body gunakan **Body → JSON**, dengan header:

```http
Accept: application/json
Content-Type: application/json
```

```http
Accept: application/json
Content-Type: application/json
```

Jika memakai Hoppscotch web, izinkan browser mengakses localhost saat diminta. Cookie auth/CORS dapat berbeda tergantung cara Hoppscotch dijalankan. Backend starter ini belum mengonfigurasi CORS untuk origin Hoppscotch/Angular eksternal. Jika cookie tidak tersimpan atau request diblokir CORS, gunakan Hoppscotch Desktop/lokal atau client same-origin yang mendukung cookie.

## 3. Uji endpoint

### A. Health check

- Method: `GET`
- URL: `{{baseUrl}}/health`
- Body: kosong
- Berhasil: HTTP `200`

Respons yang diharapkan:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "ok"
  }
}
```

`503` menandakan backend tidak dapat mengakses MySQL; periksa Laragon dan `DATABASE_URL`.

### B. Registrasi akun uji

- Method: `POST`
- URL: `{{baseUrl}}/auth/register`
- Body:

```json
{
  "name": "Hoppscotch Test",
  "email": "hoppscotch-test@example.com",
  "password": "TesAkunTicketForge123!"
}
```

Gunakan email unik. Nama 2–120 karakter, email valid, password 12–128 karakter.

- Berhasil: `201 Created`
- Email sudah terdaftar: `409 Conflict`
- Validasi gagal: `422 Unprocessable Entity`

Respons mengembalikan profil tanpa password; database menyimpan password dalam bentuk hash.

### C. Login

- Method: `POST`
- URL: `{{baseUrl}}/auth/login`
- Body:

```json
{
  "email": "hoppscotch-test@example.com",
  "password": "TesAkunTicketForge123!"
}
```

Berhasil: `200 OK`. Login menetapkan cookie `tf_access` dan `tf_refresh`. Pastikan cookie jar Hoppscotch menyimpan dan mengirim cookie untuk `localhost`. Token adalah HttpOnly—jangan taruh di URL, localStorage, atau koleksi yang dibagikan.

### D. Profil login

- Method: `GET`
- URL: `{{baseUrl}}/auth/me`
- Body: kosong
- Kirim cookie login (`tf_access`).
- Berhasil: `200 OK`; tanpa cookie valid: `401 Unauthorized`.

### E. Ubah nama (opsional)

- Method: `PATCH`
- URL: `{{baseUrl}}/auth/profile`
- Cookie: `tf_access`
- Body:

```json
{
  "name": "Hoppscotch Test Updated"
}
```

### F. Refresh sesi (opsional)

- Method: `POST`
- URL: `{{baseUrl}}/auth/refresh`
- Cookie: `tf_refresh`
- Body: `{}`
- Berhasil: `200 OK`; cookie access dan refresh diperbarui.

### G. Logout

- Method: `POST`
- URL: `{{baseUrl}}/auth/logout`
- Cookie: `tf_refresh` (opsional)
- Body: `{}`
- Berhasil: `200 OK`; sesi dicabut dan cookie dibersihkan.

Setelah logout, panggil `GET {{baseUrl}}/auth/me` lagi. Jika cookie access sudah dihapus, hasilnya `401`.

### H. Ganti password (opsional)

- Method: `PATCH`
- URL: `{{baseUrl}}/auth/password`
- Cookie: `tf_access`
- Body:

```json
{
  "currentPassword": "TesAkunTicketForge123!",
  "newPassword": "PasswordUjiBaru123!"
}
```

Password baru minimal 12 karakter. Operasi ini mencabut sesi aktif; gunakan hanya akun uji dan login kembali dengan password baru.

## 4. Ringkasan endpoint

| Method | Path | Cookie | Body |
|---|---|---|---|
| `GET` | `/health` | — | — |
| `POST` | `/auth/register` | — | `name`, `email`, `password` |
| `POST` | `/auth/login` | — | `email`, `password` |
| `POST` | `/auth/refresh` | `tf_refresh` | `{}` |
| `POST` | `/auth/logout` | `tf_refresh` opsional | `{}` |
| `GET` | `/auth/me` | `tf_access` | — |
| `PATCH` | `/auth/profile` | `tf_access` | `name` |
| `PATCH` | `/auth/password` | `tf_access` | `currentPassword`, `newPassword` |

## 5. Status umum

| Status | Arti |
|---:|---|
| `200` | Berhasil |
| `201` | Akun dibuat |
| `400` | JSON tidak valid atau password saat ini salah |
| `401` | Cookie/auth tidak ada atau tidak valid |
| `409` | Email sudah terdaftar |
| `422` | Validasi gagal |
| `500` | Error server/configuration |
| `503` | Health check tidak dapat mengakses database |

## 6. Verifikasi registrasi di MySQL

Setelah registrasi sukses, periksa baris akun tanpa menampilkan hash password:

```powershell
C:\laragon\bin\mysql\mysql-8.0.46-winx64\bin\mysql.exe --host=localhost --port=3306 --user=root --database=ticketforge_ai --execute="SELECT id,name,email,role,created_at FROM users WHERE email='hoppscotch-test@example.com';"
```

Sesuaikan path `mysql.exe` jika Laragon berada di lokasi lain. Jangan ekspor atau membagikan password atau cookie dari pengujian.

