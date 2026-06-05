# Testing Notes

## Yang Perlu Dijalankan

1. Pastikan backend aktif di `http://127.0.0.1:8000`.
2. Install dependency frontend:

```bash
npm install
```

3. Jalankan frontend:

```bash
npm run dev
```

4. Buka `http://localhost:3000`.

## Smoke Checklist

1. Status backend berubah menjadi aktif saat `Cek Backend`.
2. Modal login/register bisa dibuka.
3. Modal settings bisa mengganti URL backend dan mode transport.
4. Kamera bisa diaktifkan pada layar interpreter.
5. Prediksi huruf muncul saat sesi translation dimulai.
6. Feedback bisa dikirim setelah ada hasil prediksi.
7. Layout desktop menampilkan tiga phone mockup.
8. Layout mobile menampilkan satu phone aktif dengan bottom nav.

## Status Verifikasi di Workspace Ini

- `npm install` sukses
- `npm run lint` sukses
- `npm run build` sukses

Verifikasi visual browser tetap perlu dijalankan manual (`npm run dev`) untuk memastikan perilaku kamera sesuai device pengguna.

## CI Otomatis

Belum ada workflow CI yang dikomit di repo frontend ini. Untuk verifikasi otomatis, jalankan minimal:

```bash
npm ci
npm run lint
npm run build
```
