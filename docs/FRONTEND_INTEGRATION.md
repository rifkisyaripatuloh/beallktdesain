# TicketForge AI — Panduan Integrasi Frontend

Dokumen ini menjelaskan cara frontend Angular mengintegrasikan endpoint backend yang sudah tersedia saat ini. Ini merangkum implementasi aktual backend, bukan daftar fitur roadmap. Untuk rancangan halaman dan langkah membangun frontend dari awal, lihat [FRONTEND_BUILD_SPEC.md](./FRONTEND_BUILD_SPEC.md).

## 1. Backend dan status layanan

- Base URL development: `http://localhost:3000/api/v1`
- Runtime: Node.js 22
- Database: MySQL melalui Prisma
- Semua endpoint API saat ini menggunakan JSON, kecuali respons health check.
- Untuk instruksi uji interaktif melalui Hoppscotch, lihat [HOPPSCOTCH_API_TESTING.md](./HOPPSCOTCH_API_TESTING.md).
- Frontend pada `http://localhost:4200` diizinkan oleh CORS backend melalui `src/proxy.ts`, termasuk preflight `OPTIONS` dan credentials. Jika FE berjalan pada origin lain, tambahkan origin eksplisit ke allowlist tersebut dan restart backend. Jangan gunakan wildcard CORS bersama credentials.

> [!IMPORTANT]
> Endpoint API dan konfigurasi MySQL berbeda port. API saat ini berjalan di port `3000`; MySQL Laragon di environment project ini berjalan pada port `3306`. Jangan mengubah base URL API menjadi port database.

## 2. Endpoint yang tersedia

| Method | Endpoint | Auth cookie | Fungsi |
|---|---|---:|---|
| `GET` | `/health` | Tidak | Status API dan koneksi DB |
| `POST` | `/auth/register` | Tidak | Membuat akun |
| `POST` | `/auth/login` | Tidak | Login; mengatur cookie access/refresh |
| `POST` | `/auth/refresh` | Refresh cookie | Rotasi refresh token dan perbarui access token |
| `POST` | `/auth/logout` | Refresh cookie opsional | Cabut sesi aktif dan bersihkan cookie |
| `GET` | `/auth/me` | Access cookie | Ambil profil pengguna saat ini |
| `PATCH` | `/auth/profile` | Access cookie | Ubah nama pengguna |
| `PATCH` | `/auth/password` | Access cookie | Ubah password dan cabut seluruh sesi |

- `GET /designs?search=...`, `POST /designs`, `GET/PATCH/DELETE /designs/:id` — CRUD desain milik user.
- `POST /designs/generate` — draft config desain tiket dari Ollama lokal (atau fallback template bila Ollama tidak aktif); lihat [DESIGN_API.md](./DESIGN_API.md).

Path lengkap adalah base URL ditambah endpoint, misalnya `http://localhost:3000/api/v1/auth/login`.


## 3. Format request

Kirim body sebagai JSON dengan header:

```http
Content-Type: application/json
Accept: application/json
```

### Register

`POST /auth/register`

```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "GunakanPasswordKuat123!"
}
```

- `name`: 2–120 karakter.
- `email`: email valid; disimpan dalam lowercase.
- `password`: 12–128 karakter.

### Login

`POST /auth/login`

```json
{
  "email": "budi@example.com",
  "password": "GunakanPasswordKuat123!"
}
```

Login menghasilkan access token JWT dan refresh token melalui `Set-Cookie`; jangan membaca atau menyimpan nilai token di `localStorage`.

### Perbarui profil

`PATCH /auth/profile`

```json
{ "name": "Budi Santoso Baru" }
```

### Ganti password

`PATCH /auth/password`

```json
{
  "currentPassword": "GunakanPasswordKuat123!",
  "newPassword": "PasswordBaruLebihKuat456!"
}
```

Password baru minimal 12 karakter. Setelah berhasil, semua sesi dicabut dan pengguna perlu login kembali.

## 4. Cookie authentication dari Angular

Karena token menggunakan HttpOnly cookie, browser yang mengelola cookie. Untuk development cross-origin (misalnya Angular di port `4200` dan API di `3000`), aktifkan credentials di setiap request:

```ts
this.http.post<LoginResponse>(
  `${environment.apiBaseUrl}/auth/login`,
  { email, password },
  { withCredentials: true },
);
```

Gunakan `withCredentials: true` juga pada `refresh`, `logout`, `me`, `profile`, dan `password`. Jangan menambahkan `Authorization: Bearer` karena backend sekarang membaca cookie.

`HttpOnly` mencegah JavaScript frontend membaca token. Cookie development `SameSite=Lax`; production memerlukan HTTPS. CORS dengan allowlist origin dan credentials belum disiapkan di starter backend, jadi cross-origin Angular requests mungkin ditolak sampai backend menambah konfigurasi CORS. Hindari wildcard `Access-Control-Allow-Origin: *` ketika credentials dipakai.

## 5. Format respons

### Berhasil

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": "...",
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "role": "USER"
    }
  },
  "meta": null
}
```

`data` bervariasi sesuai endpoint. `register` memberi object pengguna langsung; `login`, `refresh`, `logout`, dan profil mengembalikan payload sesuai operasinya.

### Gagal

```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": {}
}
```

Frontend sebaiknya memeriksa status HTTP dan `success`, tidak mengasumsikan bahwa semua error memiliki struktur `errors`.

### Status penting

| HTTP | Arti umum |
|---:|---|
| `200` | Berhasil |
| `201` | Akun berhasil dibuat |
| `400` | JSON tidak valid / data salah |
| `401` | Kredensial atau sesi tidak valid |
| `409` | Email sudah terdaftar |
| `422` | Validasi gagal |
| `500` | Error server atau konfigurasi |
| `503` | Database health check tidak tersedia |

## 6. Contoh pola service Angular

```ts
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly base = `${environment.apiBaseUrl}/auth`;

  constructor(private readonly http: HttpClient) {}

  register(input: { name: string; email: string; password: string }) {
    return this.http.post<ApiResponse<User>>(
      `${this.base}/register`, input, { withCredentials: true },
    );
  }

  login(input: { email: string; password: string }) {
    return this.http.post<ApiResponse<{ user: User }>>(
      `${this.base}/login`, input, { withCredentials: true },
    );
  }

  me() {
    return this.http.get<ApiResponse<User>>(
      `${this.base}/me`, { withCredentials: true },
    );
  }

  refresh() {
    return this.http.post<ApiResponse<{ user: User }>>(
      `${this.base}/refresh`, {}, { withCredentials: true },
    );
  }

  logout() {
    return this.http.post<ApiResponse<null>>(
      `${this.base}/logout`, {}, { withCredentials: true },
    );
  }
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: unknown;
  errors?: unknown;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'USER' | 'ORGANIZATION_ADMIN' | 'ORGANIZATION_EDITOR';
}
```

Tambahkan interceptor untuk `withCredentials` dan untuk menangani `401` secara terkendali. Jika `refresh` mengembalikan `401`, arahkan pengguna ke login dan jangan membuat loop refresh.

## 7. Contoh alur aplikasi

1. Saat aplikasi dimulai, panggil `GET /auth/me` dengan credentials.
2. Jika `200`, simpan profil non-rahasia dalam state aplikasi.
3. Jika `401`, tampilkan halaman login.
4. Setelah login sukses, muat `me` atau gunakan `data.user` pada respons login.
5. Saat `401` karena access token kedaluwarsa, coba `POST /auth/refresh` satu kali, lalu ulangi request awal paling banyak satu kali.
6. Logout dengan `POST /auth/logout`, lalu kosongkan state pengguna di frontend.

Jangan menyimpan password, access token, refresh token, atau NIK di browser storage/log.

## 8. Koneksi dan pengujian database Laragon

Environment backend pada mesin ini memakai MySQL di port `3306` (bukan port API):

```env
DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/ticketforge_ai"
```

Sesuaikan `USER` dan `PASSWORD` dengan Laragon. Database `ticketforge_ai` harus sudah dibuat. Setelah `.env` diisi:

```powershell
npm run db:generate
npm run db:migrate -- --name init
npm run dev
```

Lalu uji:
1. `GET http://localhost:3000/api/v1/health` harus memberi HTTP 200 dan `database: "ok"`.
2. `POST /api/v1/auth/register` harus memberi HTTP 201.
3. `POST /api/v1/auth/login` harus berhasil dan browser menerima cookie HttpOnly.
4. `GET /api/v1/auth/me` dengan credentials harus mengembalikan profil.
5. Periksa tabel `users` di MySQL Laragon bahwa user terdaftar tersimpan; jangan gunakan password asli untuk pengujian yang akan dibagikan.

> [!WARNING]
> Jangan mengklaim API tersimpan ke MySQL sebelum `DATABASE_URL` benar, migration selesai, dan registrasi benar-benar diperiksa di tabel MySQL. Pada mesin ini Prisma Client telah digenerate memakai engine lokal. Jika API tidak dapat dijalankan, pastikan engine tersedia dan gunakan build production/webpack bila Turbopack gagal membuat junction di Windows.

## 9. Ketentuan yang perlu diketahui frontend

- Model `UserRole` tersedia di schema, tetapi frontend tidak boleh menganggap pengaturan role/authorization organisasi sudah lengkap.
- Tidak ada CSRF protection atau login rate limiting pada foundation saat ini. Jangan deploy auth ini ke production sebelum kontrol tersebut diterapkan.
- Jangan pernah mengirim NIK melalui endpoint publik. NIK harus dienkripsi di backend saat fitur anggota ditambahkan.
- Endpoint CRUD fitur TicketForge AI lainnya akan didokumentasikan saat backend-nya diimplementasikan.

