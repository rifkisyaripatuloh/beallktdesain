# Desain Ticket dan AI lokal

## API desain
Semua desain adalah milik user sesi saat ini. Kirim cookie dengan credentials; jangan kirim/menyimpan JWT pada FE.

- `GET /api/v1/designs?search=...` — daftar maksimal 100 desain milik user.
- `POST /api/v1/designs` — buat desain. Body: `name`, `type`, `width`, `height`, `unit?`, `config`.
- `GET /api/v1/designs/:id` — baca desain dan sisi-sisinya.
- `PATCH /api/v1/designs/:id` — ubah satu atau lebih dari field create.
- `DELETE /api/v1/designs/:id` — hapus desain milik user.

Jenis `type`: `EVENT_TICKET`, `PARKING_TICKET`, `ENTRY_TICKET`, `INVITATION`, `MEMBERSHIP_CARD`, `ID_CARD`, `CUSTOM`. Config canvas minimal: `version`, `type`, `canvas:{width,height,unit?,background?}`, `elements`. Elemen memiliki `id`, `type`, `x`, `y`; jenis elemen `text`, `image`, `rectangle`, `circle`, `line`, `qr`, `barcode`, `svg`, `background`. Properti visual tambahan disimpan sebagai JSON untuk editor FE. `config.type` dan ukuran canvas harus sama dengan kolom desain.

## AI generator Ollama

Endpoint authenticated: `POST /api/v1/designs/generate`.

```json
{
  "prompt": "Tiket konser malam, warna gelap dan aksen emas, sertakan judul serta area QR",
  "type": "EVENT_TICKET",
  "width": 1050,
  "height": 600,
  "unit": "px"
}
```

Untuk memperbarui riwayat generasi pada desain milik sendiri, opsional sertakan `designId`. Response `data` berisi `config`, `model`, `aiAvailable`, dan opsional `warning`. Config adalah draft: preview, sanitasi, dan izinkan pengguna mengedit sebelum `POST/PATCH /designs`. Generator membatasi format JSON dan jumlah elemen; jangan merender HTML/SVG mentah tanpa sanitasi.

### Menjalankan Ollama lokal

1. Pasang Ollama dari situs resminya dan jalankan service lokal.
2. Unduh model instruksi ringan, misalnya `ollama pull qwen2.5:3b` (sesuaikan RAM/performa komputer).
3. Tambahkan konfigurasi backend lokal:

```env
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="qwen2.5:3b"
```

4. Restart backend. Jika Ollama/model tidak tersedia, endpoint menghasilkan template lokal dasar yang tetap dapat diedit, dengan `aiAvailable: false` dan warning; periksa status ini di UI agar tidak menyebutnya hasil AI.

Ollama lokal menghindari biaya API provider, tetapi membutuhkan resource mesin pengguna. Jangan membuka port Ollama ke internet. Bila API backend dipublikasikan sementara Ollama hanya ada di komputer developer, request harus diproxy ke runtime Ollama yang dapat dijangkau server, bukan URL loopback browser.

## Smoke-test

1. Login di FE/Hoppscotch dan pastikan request menyertakan cookie sesi.
2. `POST /designs/generate`, tinjau `data.config` serta status `aiAvailable`.
3. `POST /designs` dengan `config` dari hasil generator; verifikasi `201`.
4. `GET /designs`, `GET /designs/:id`, `PATCH /designs/:id`, lalu `DELETE /designs/:id`.
5. Login sebagai user lain dan pastikan ID desain user pertama menghasilkan `404`.

CORS allowlist saat ini adalah `http://localhost:4200`; `designs/generate` tetap memerlukan login. Bila FE memakai origin lain, tambahkan origin eksplisit di `src/proxy.ts`.

