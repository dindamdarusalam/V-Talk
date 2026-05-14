# Frontend Handover

## Arah Desain

Frontend ini dibangun ulang ke `Next.js` dengan target visual yang sangat dekat ke referensi gambar:

- latar ungu penuh,
- tiga device mockup,
- kartu kuning untuk lesson,
- layar interpretasi kamera dengan panel hasil putih di bawah.

Pada desktop, ketiga device tampil berdampingan seperti referensi. Pada mobile, layout berubah menjadi satu device aktif yang bisa berpindah via bottom navigation.

## Kesesuaian dengan Project Plan

Dokumen utama proyek menyebut:

- platform web,
- React.js/Next.js,
- integrasi AI real-time,
- milestone frontend dan integration,
- fokus pada komunitas Teman Tuli.

Implementasi ini mengikuti poin-poin itu dengan:

- `Next.js` App Router,
- mobile-first interaction,
- live interpreter screen,
- feedback loop ke backend,
- lesson/dashboard screen untuk memvisualkan value produk.

## Integrasi Backend

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/translations/predict`
- `POST /api/v1/feedback`
- `WS /ws/translations`

## Catatan Implementasi

- `public/reference.webp` dipakai sebagai basis visual crop untuk meniru foto pada referensi.
- Interpreter mendukung mode `WebSocket` dan `REST`.
- Login bersifat opsional; guest tetap bisa mencoba interpretasi.
- Transcript disimpan lokal agar sesi tetap terasa kontinu.
