# API Handover V-Talk Backend

Dokumen ini merangkum kontrak integrasi backend untuk frontend V-Talk.

## Base URL

```text
http://localhost:8000
```

## Authentication

Backend menyediakan auth dasar berbasis JWT.

### Register

`POST /api/v1/auth/register`

```json
{
  "email": "user@example.com",
  "full_name": "Nama User",
  "password": "password123"
}
```

### Login

`POST /api/v1/auth/login`

Response akan mengembalikan `access_token`.

Gunakan header berikut pada request frontend bila user sudah login:

```text
Authorization: Bearer <token>
```

## Prediksi REST

`POST /api/v1/translations/predict`

```json
{
  "frame_data": "data:image/jpeg;base64,...",
  "source_type": "video_frame"
}
```

Response:

```json
{
  "success": true,
  "message": "Prediction completed",
  "data": {
    "translation_id": 1,
    "request_id": "tr_xxx",
    "predicted_text": "A",
    "confidence": 0.9214,
    "inference_provider": "mock",
    "source_type": "video_frame",
    "created_at": "2026-05-14T09:00:00+00:00"
  },
  "error": null,
  "meta": {}
}
```

## Prediksi WebSocket

`WS /ws/translations`

Jika user sudah login, frontend bisa menambahkan token sebagai query param agar log translasi tersimpan ke user tersebut:

```text
ws://localhost:8000/ws/translations?token=<access_token>
```

Payload yang dikirim frontend:

```json
{
  "frame_data": "data:image/jpeg;base64,...",
  "source_type": "video_frame"
}
```

Response event:

```json
{
  "success": true,
  "message": "Prediction completed",
  "data": {
    "translation_id": 1,
    "request_id": "tr_xxx",
    "predicted_text": "A",
    "confidence": 0.9214,
    "source_type": "video_frame",
    "inference_provider": "mock",
    "created_at": "2026-05-14T09:00:00+00:00"
  },
  "error": null,
  "meta": {}
}
```

## Feedback

`POST /api/v1/feedback`

```json
{
  "translation_id": 1,
  "rating": "correct",
  "note": "Prediksi sudah sesuai"
}
```

Jika translasi dibuat oleh user login, feedback hanya bisa dikirim oleh user yang sama. Guest tetap bisa memberi feedback untuk translasi guest.

## Riwayat Translasi

`GET /api/v1/translations/history?limit=20`

Endpoint ini mengembalikan log translasi terbaru milik user yang sedang login. Header `Authorization` wajib dikirim agar riwayat user lain tidak terbaca oleh guest/session lain.

```text
Authorization: Bearer <token>
```

## Error Response

HTTP error juga memakai envelope yang sama:

```json
{
  "success": false,
  "message": "Email already registered",
  "data": null,
  "error": {
    "code": "http_error",
    "details": "Email already registered"
  },
  "meta": {}
}
```

## Health Check

`GET /api/v1/health`

Dipakai frontend/devops untuk memastikan service aktif.
Field `inference_provider` menunjukkan provider yang benar-benar aktif. Field `configured_inference_provider` dan `inference.provider_warning` dipakai untuk mendeteksi env yang belum didukung.

## Catatan untuk Tim Frontend

- Backend menerima frame dalam bentuk base64 biasa atau data URL.
- Untuk mode real-time, frontend sebaiknya kirim frame terkompresi JPEG tiap 300-700 ms agar latensi stabil.
- Struktur response selalu memakai envelope: `success`, `message`, `data`, `error`, `meta`.
- Saat model AI final belum dipasang, provider default adalah `mock`, jadi hasil huruf masih simulasi deterministik.

## Catatan Deployment

- Backend deploy ke Render dan memakai Supabase PostgreSQL melalui `DATABASE_URL`.
- Frontend yang dipakai adalah `vtalk-frontend` dan deploy ke Vercel.
- Di Render, set `DATABASE_URL` Supabase dengan `sslmode=require`.
- Di Render, set `CORS_ORIGINS` ke domain Vercel frontend, misalnya `https://<domain-frontend-vercel-anda>`.
- Di Vercel, set `NEXT_PUBLIC_API_BASE_URL` ke domain backend Render, misalnya `https://<domain-backend-render-anda>`.
- Simpan secret key production pada environment variable.
- Production startup menolak `SECRET_KEY=change-this-secret-key`, `DEFAULT_USER_PASSWORD=demo12345`, SQLite `DATABASE_URL`, dan placeholder Vercel pada `CORS_ORIGINS`.
