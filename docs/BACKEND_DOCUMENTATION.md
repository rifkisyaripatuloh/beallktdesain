# TicketForge AI Backend — Dokumentasi Implementasi

**Versi dokumen:** 1.0  
**Status:** Starter backend; endpoint auth dan health sudah diimplementasikan. Fitur bisnis lain masih bertahap.

## 1. Ringkasan

TicketForge AI backend menyediakan REST API untuk fondasi autentikasi, profil pengguna, dan pemeriksaan koneksi database. Backend memakai Next.js App Router sebagai API server, Node.js 22, TypeScript, Prisma ORM, dan MySQL 8+.

> [!IMPORTANT]
> Dokumentasi ini hanya menjelaskan endpoint yang sudah ada di source code. Endpoint untuk organisasi, anggota, template/desain, AI, tiket/kartu massal, import, QR, dan export belum tersedia untuk dipanggil.

## 2. Teknologi dan komponen

| Komponen | Implementasi |
|---|---|
| API framework | Next.js App Router / Route Handlers |
| Runtime | Node.js 22 |
| Bahasa | TypeScript |
| Database | MySQL 8+ (Laragon pada environment project ini: port `3306`) |
| ORM | Prisma ORM |
| Validasi input | Zod |
| Password | Argon2id |
| Access auth | JWT dalam HttpOnly cookie |
| Refresh auth | Token acak; nilai hash SHA-256 disimpan di database dan dirotasi |
| API test collection | Hoppscotch |

## 3. Menjalankan backend

Pastikan Node.js 22, dependency project, dan MySQL Laragon tersedia. Database `.env` harus menunjuk ke schema `ticketforge_ai`; jangan membagikan isi `.env`.

PowerShell mungkin menolak `npm.ps1` karena execution policy. Gunakan `npm.cmd` tanpa perlu mengubah policy:

```powershell
cd "D:\project kantor\nyoba"
```

Apabila runtime meminta Prisma engine path lokal, set environment variable berikut di terminal PowerShell yang sama sebelum menjalankan build atau server:

```powershell
$env:PRISMA_QUERY_ENGINE_LIBRARY = "D:\project kantor\nyoba\node_modules\@prisma\engines\query_engine-windows.dll.node"
$env:PRISMA_SCHEMA_ENGINE_BINARY = "D:\project kantor\nyoba\node_modules\@prisma\engines\schema-engine-windows.exe"
```

Jalankan server development:

```powershell
npm.cmd run dev
```

Atau build dan jalankan server production:

```powershell
npm.cmd run build
npm.cmd run start
```

Base URL default API: `http://localhost:3000/api/v1`. Jalankan **satu server saja** pada port yang sama. Jika port `3000` digunakan server lama, hentikan server itu dengan `Ctrl+C` di terminal yang menjalankannya, atau pilih port alternatif, misalnya `npm.cmd run dev -- -p 3001`.

Untuk environment Windows ini, `npm run build` memakai Webpack agar tidak terkena masalah junction point Turbopack pada Windows.

## 4. Konfigurasi database dan migrasi

Laragon MySQL yang diperiksa untuk project ini adalah MySQL 8.0.46 di port `3306`. URL koneksi ada di `.env`, format umumnya:

```env
DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/ticketforge_ai"
```

Buat schema database apabila belum tersedia:

```sql
CREATE DATABASE ticketforge_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Generate Prisma Client dan terapkan migration yang sudah ada:

```powershell
npm.cmd run db:generate
npm.cmd run db:deploy
```

Di environment project ini, Prisma Client berhasil digenerate dengan engine Windows yang sudah terinstal lokal. Jangan mengambil binary Prisma dari sumber tak resmi atau mengabaikan kebijakan akses network.

## 5. API conventions

- API prefix: `/api/v1`.
- Endpoint yang menggunakan body menerima JSON dengan `Content-Type: application/json`.
- Respons sukses umumnya berbentuk `{ "success": true, "message": "...", "data": ..., "meta": null }`.
- Respons gagal umumnya berbentuk `{ "success": false, "message": "...", "errors": ... }`.
- Auth menggunakan cookies bernama `tf_access` dan `tf_refresh`, bukan Bearer token.
- Cookie token bersifat HttpOnly. Client tidak boleh menyimpan token di `localStorage`.

## 6. Endpoint yang tersedia

Base URL lengkap untuk development: `http://localhost:3000/api/v1`.

| Method | Path | Autentikasi | Keterangan |
|---|---|---|---|
| `GET` | `/health` | Tidak | Query database `SELECT 1`; status DB |
| `POST` | `/auth/register` | Tidak | Registrasi user |
| `POST` | `/auth/login` | Tidak | Login dan set access/refresh cookies |
| `POST` | `/auth/refresh` | Cookie `tf_refresh` | Rotasi refresh token dan renew access cookie |
| `POST` | `/auth/logout` | Refresh cookie opsional | Cabut session jika ada dan bersihkan cookies |
| `GET` | `/auth/me` | Cookie `tf_access` | Profil user saat ini |
| `PATCH` | `/auth/profile` | Cookie `tf_access` | Ubah nama user |
| `PATCH` | `/auth/password` | Cookie `tf_access` | Ganti password; cabut semua sesi user |

### 6.1 Health check

`GET /api/v1/health`

Jika MySQL dapat diakses, menghasilkan HTTP `200`, misalnya:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "ok"
  }
}
```

Jika koneksi database gagal, endpoint mengembalikan HTTP `503` dengan status degraded.

### 6.2 Register

`POST /api/v1/auth/register`

Request:

```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "GunakanPasswordUji123!"
}
```

Aturan: nama 2–120 karakter, email harus valid, password 12–128 karakter. Email dinormalisasi ke lowercase. Sukses: HTTP `201`; email duplikat: HTTP `409`; validasi gagal: HTTP `422`. Password tidak dikembalikan ke client dan di-hash menggunakan Argon2id.

### 6.3 Login

`POST /api/v1/auth/login`

```json
{
  "email": "budi@example.com",
  "password": "GunakanPasswordUji123!"
}
```

Sukses HTTP `200`, response user, serta dua cookie HttpOnly: `tf_access` dan `tf_refresh`. Login gagal mengembalikan HTTP `401`.

### 6.4 Me

`GET /api/v1/auth/me`

Memerlukan cookie `tf_access`. Sukses HTTP `200`; tanpa sesi valid HTTP `401`.

### 6.5 Refresh

`POST /api/v1/auth/refresh`

Memerlukan cookie `tf_refresh`. Tidak memerlukan field body; kirim body `{}` bila API client meminta JSON. Sukses HTTP `200`; refresh cookie dirotasi sehingga gunakan cookie terbaru untuk request berikutnya.

### 6.6 Logout

`POST /api/v1/auth/logout`

Body `{}` bila diperlukan. Mencabut refresh session terkait jika cookie tersedia dan menghapus cookies dari response.

### 6.7 Update profile

`PATCH /api/v1/auth/profile`

Memerlukan `tf_access`.

```json
{ "name": "Budi Santoso Baru" }
```

### 6.8 Change password

`PATCH /api/v1/auth/password`

Memerlukan `tf_access`.

```json
{
  "currentPassword": "GunakanPasswordUji123!",
  "newPassword": "PasswordUjiBaru456!"
}
```

Password baru minimal 12 karakter. Sukses akan mengganti hash password, mencabut sesi aktif pengguna, dan menghapus access cookie. Uji endpoint ini hanya dengan akun test.

## 7. Uji dengan Hoppscotch

File impor disertakan di folder `docs`:

- [Koleksi Hoppscotch](./hoppscotch-collection.json) — 8 request dengan method, URL, header, contoh body, dan assertions dasar.
- [Environment Hoppscotch](./hoppscotch-environment.json) — `baseUrl` default `http://localhost:3000/api/v1`.
- [Panduan uji Hoppscotch](./HOPPSCOTCH_API_TESTING.md) — urutan dan catatan tiap request.

Di Hoppscotch, import file melalui **Collections → Import** dan **Environments → Import**, aktifkan environment `TicketForge Local`, lalu jalankan **Health check → Register test user → Login test user → Current user**. Ganti email contoh dengan email unik sebelum registrasi.

Request yang memerlukan cookie harus menerima cookie dari response login dan mengirim cookie tersebut pada request selanjutnya. Cookie Hoppscotch web dapat dipengaruhi browser policy, CORS, dan localhost permissions; bila tidak tersimpan, gunakan Hoppscotch Desktop/lokal atau client same-origin yang mengelola cookie. CORS untuk origin eksternal belum dikonfigurasi pada backend.

## 8. Tabel dan model database

Schema Prisma mendefinisikan model user/session, organisasi/membership, anggota dan token QR, template/desain/aset/sisi desain, tiket dan batch kartu/tiket, riwayat AI, dan riwayat export. Migration awal `0001_init` sudah diterapkan pada database `ticketforge_ai` dan membuat 16 tabel pada saat diverifikasi. Sebagian model adalah fondasi schema dan belum memiliki endpoint CRUD.

Untuk memeriksa user hasil register tanpa menampilkan hash password:

```sql
SELECT id, name, email, role, created_at
FROM users
WHERE email = 'budi@example.com';
```

## 9. Status kode dan batasan saat ini

- Auth dasar dan health endpoint sudah diimplementasikan.
- API health, register/login, serta persistensi akun **belum tercatat sebagai smoke test end-to-end yang berhasil**; jangan menganggapnya teruji hanya dari keberhasilan migration atau Prisma query langsung.
- Next.js production build berhasil dengan Webpack. Pada Windows sandbox/dev, Turbopack pernah gagal membuat junction point untuk `@prisma/client` (Access denied); jika terjadi, coba server production hasil build atau jalankan proses dari terminal Windows dengan izin filesystem yang sesuai.
- Endpoint fitur bisnis utama masih belum diimplementasikan.
- CORS, CSRF defense, login rate limiting, email verification, account recovery, audit logging, dan authorization resource-level harus ditambahkan sebelum pemakaian production.
- Tidak ada OpenAPI/Swagger spec lengkap pada foundation ini.

## 10. Quality commands

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## 11. File terkait

- [README proyek](../README.md)
- [Panduan integrasi frontend](./FRONTEND_INTEGRATION.md)
- [Panduan Hoppscotch](./HOPPSCOTCH_API_TESTING.md)
- [Collection JSON Hoppscotch](./hoppscotch-collection.json)
- [Environment JSON Hoppscotch](./hoppscotch-environment.json)
- [Prisma schema](../prisma/schema.prisma)
- [Migration awal](../prisma/migrations/0001_init/migration.sql)

