# V-Talk Backend

Backend untuk proyek V-Talk (Vision Talk) yang menyediakan:

- REST API untuk autentikasi, prediksi transliterasi, dan feedback.
- WebSocket real-time untuk pengiriman frame webcam dari frontend.
- Logging hasil prediksi ke database.
- Service inference yang berjalan dalam mode `mock` sekarang dan siap diganti ke model AI asli.
- Artefak deployment dasar untuk Docker.

## Arsitektur Singkat

- `FastAPI`: server HTTP + dokumentasi Swagger + WebSocket.
- `SQLAlchemy + PostgreSQL/Supabase untuk produksi, SQLite untuk lokal`: penyimpanan user, log transliterasi, dan feedback.
- `JWT`: autentikasi dasar untuk integrasi frontend yang butuh sesi user.
- `InferenceService`: lapisan terpisah agar tim AI bisa mengganti provider/model tanpa mengubah endpoint.

## Struktur

```text
vtalk-backend/
  app/
    api/
    core/
    db/
    models/
    schemas/
    services/
    main.py
  tests/
  Dockerfile
  docker-compose.yml
  requirements.txt
```

## Menjalankan Lokal

1. Buat virtual environment.
2. Install dependency:

```bash
pip install -r requirements.txt
```

3. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL` dari Supabase. Untuk Render, isi variabel di dashboard Render, bukan dari file `.env`.
4. Jalankan server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Dokumentasi interaktif tersedia di `/docs`.

## Endpoint Utama

### REST

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/translations/predict`
- `POST /api/v1/feedback`

### WebSocket

- `WS /ws/translations`

Kirim payload:

```json
{
  "frame_data": "base64-image-or-data-url",
  "source_type": "video_frame"
}
```

## Contoh Alur Integrasi Frontend

1. Frontend membuka webcam dengan `getUserMedia`.
2. Frame diambil dari `<canvas>` lalu diubah menjadi base64.
3. Frame dikirim ke:
   - REST `POST /api/v1/translations/predict`, atau
   - WebSocket `/ws/translations` untuk mode real-time.
4. Backend mengembalikan huruf hasil transliterasi + confidence.
5. Frontend menampilkan teks hasil terjemahan secara instan.

## Menyambungkan Model AI Asli

Service inference saat ini memakai provider `mock`, supaya backend bisa dites end-to-end tanpa menunggu model final.

Saat model AI siap:

1. Letakkan model pada path yang sesuai.
2. Tambahkan provider baru di `app/services/inference.py`.
3. Ubah `INFERENCE_PROVIDER` dan `MODEL_PATH` pada `.env`.


## Deployment Produksi

Target produksi yang direkomendasikan:

```text
Frontend: Vercel
Backend : Render Web Service
Database: Supabase PostgreSQL
```

### Supabase

Ambil connection string dari Supabase Dashboard:

```text
Project Settings > Database > Connection string
```

Gunakan URL PostgreSQL dengan `sslmode=require`, contohnya:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
```

Backend juga menerima format `postgres://...` dan `postgresql://...`, lalu menormalkannya ke driver `psycopg2`.

### Render Backend

Set variabel ini di Render Environment Variables:

```env
APP_ENV=production
SECRET_KEY=<random-secret>
DATABASE_URL=postgresql+psycopg2://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
CORS_ORIGINS=https://<domain-frontend-vercel-anda>
DEFAULT_USER_PASSWORD=<password-demo-yang-aman>
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=5
DATABASE_POOL_TIMEOUT=30
DATABASE_POOL_RECYCLE_SECONDS=1800
```

Backend akan menolak startup production jika:

- `SECRET_KEY` masih `change-this-secret-key`.
- `DEFAULT_USER_PASSWORD` masih `demo12345`.
- `DATABASE_URL` masih SQLite atau bukan PostgreSQL/Supabase.
- `CORS_ORIGINS` masih memakai placeholder Vercel.

Dockerfile sudah memakai `$PORT` dari Render.

### Vercel Frontend

Frontend yang dipakai adalah folder `vtalk-frontend`. Set variabel ini di Vercel:

```env
NEXT_PUBLIC_API_BASE_URL=https://<domain-backend-render-anda>
NEXT_PUBLIC_DEFAULT_TRANSPORT=websocket
```

## Testing

```bash
pytest
```

## Cakupan Fase 1-6

- Fase 1: arsitektur, kontrak API, dan skema data selesai.
- Fase 2: setup backend, database, dan auth dasar selesai.
- Fase 3: REST API + WebSocket + error structure selesai.
- Fase 4: service inference terintegrasi dengan endpoint selesai.
- Fase 5: unit/integration test dasar tersedia.
- Fase 6: dokumentasi teknis + Docker deployment tersedia.
