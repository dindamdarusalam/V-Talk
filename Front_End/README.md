# V-Talk Frontend Next.js

Frontend `Next.js` untuk proyek **V-Talk (Vision Talk)** yang diselaraskan dengan:

- [Project_Plan_V-Talk.md](/c:/Users/User/Downloads/capstone%20project/Project_Plan_V-Talk.md)
- backend FastAPI yang sudah dibuat di folder `Back_end`
- referensi visual `original-c0cca9f1b3c6160834fd978a1b806380.webp`

## Yang Sudah Diimplementasikan

- Struktur `Next.js App Router`
- UI responsif dengan komposisi tiga phone mockup seperti referensi
- Dashboard lesson, lesson preview, dan layar interpreter real-time
- Integrasi backend:
  - `GET /api/v1/health`
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/translations/predict`
  - `POST /api/v1/feedback`
  - `WS /ws/translations`
- Pengaturan backend URL, mode transport, interval frame, kualitas JPEG, mirror camera
- Penyimpanan config, auth, dan transcript di `localStorage`

## Struktur

```text
Front_End/
  app/
    globals.css
    layout.tsx
    page.tsx
  components/
    vtalk-experience.tsx
  public/
    reference.webp
  docs/
  package.json
  tsconfig.json
  next.config.mjs
```

## Menjalankan Lokal

```bash
npm install
npm run dev
```

Lalu buka `http://localhost:3000`.

## Catatan Penting di Workspace Ini

Environment saat ini belum menyediakan `node`/`npm` di PATH, jadi saya sudah menyusun source code Next.js-nya tetapi belum bisa menjalankan `npm install` atau `npm run dev` langsung dari mesin ini. Backend tetap bisa dijalankan dan kontrak integrasinya sudah diikuti oleh frontend ini.

## Kesesuaian dengan Project Plan

- **Planning & Research**: UI mobile-first dan aksesibilitas visual diterapkan.
- **Frontend & Integration**: layar kamera, hasil translasi, dan integrasi AI/backend tersedia.
- **Evaluation**: state error, feedback, transcript, dan health indicator tersedia untuk testing.
- **Final Handover**: struktur project, dokumen handover, dan catatan deployment disiapkan.
