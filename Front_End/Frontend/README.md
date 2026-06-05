# V-Talk Frontend Next.js

Frontend `Next.js` untuk proyek **V-Talk (Vision Talk)**.

Tagline aplikasi: **Edukasi bahasa isyarat: menjembatani komunikasi serta mewujudkan kesetaraan.**

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
vtalk-frontend/
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
cp .env.local.example .env.local
npm run dev
```

Lalu buka `http://localhost:3000`.

Isi `.env.local` untuk local development:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_TRANSPORT=websocket
```

## Deployment Vercel

Set environment variable ini di Vercel agar frontend terhubung ke backend Render:

```env
NEXT_PUBLIC_API_BASE_URL=https://<domain-backend-render-anda>
NEXT_PUBLIC_SITE_URL=https://<domain-frontend-vercel-anda>
NEXT_PUBLIC_DEFAULT_TRANSPORT=websocket
```

Pastikan URL Vercel frontend juga dimasukkan ke `CORS_ORIGINS` pada backend Render.

## Catatan Verifikasi

Frontend sudah diverifikasi dengan:

- `npm install`
- `npm run lint`
- `npm run build`

Build produksi berhasil tanpa error.

## Kesesuaian dengan Project Plan

- **Planning & Research**: UI mobile-first dan aksesibilitas visual diterapkan.
- **Frontend & Integration**: layar kamera, hasil translasi, dan integrasi AI/backend tersedia.
- **Evaluation**: state error, feedback, transcript, dan health indicator tersedia untuk testing.
- **Final Handover**: struktur project, dokumen handover, dan catatan deployment disiapkan.
