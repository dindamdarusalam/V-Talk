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

## Keterbatasan Verifikasi di Workspace Ini

Source code Next.js sudah selesai, tetapi runtime `npm` belum bisa dieksekusi di mesin ini karena `node` dan `npm` belum tersedia di PATH. Jadi verifikasi yang belum bisa saya lakukan dari sini adalah build/run browser secara langsung.
