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

## Health Check

`GET /api/v1/health`

Dipakai frontend/devops untuk memastikan service aktif.

## Catatan untuk Tim Frontend

- Backend menerima frame dalam bentuk base64 biasa atau data URL.
- Untuk mode real-time, frontend sebaiknya kirim frame terkompresi JPEG tiap 300-700 ms agar latensi stabil.
- Struktur response selalu memakai envelope: `success`, `message`, `data`, `error`, `meta`.
- Saat model AI final belum dipasang, provider default adalah `mock`, jadi hasil huruf masih simulasi deterministik.

## Catatan Deployment

- Jalankan dengan Docker atau `uvicorn`.
- Simpan secret key production pada environment variable.
- Batasi `CORS_ORIGINS` sesuai domain frontend live.
