# V-Talk Backend

Backend untuk proyek V-Talk (Vision Talk) yang menyediakan:

- REST API untuk autentikasi, prediksi transliterasi, dan feedback.
- WebSocket real-time untuk pengiriman frame webcam dari frontend.
- Logging hasil prediksi ke database.
- Service inference yang berjalan dalam mode `mock` sekarang dan siap diganti ke model AI asli.
- Artefak deployment dasar untuk Docker.

## Arsitektur Singkat

- `FastAPI`: server HTTP + dokumentasi Swagger + WebSocket.
- `SQLite + SQLAlchemy`: penyimpanan user, log transliterasi, dan feedback.
- `JWT`: autentikasi dasar untuk integrasi frontend yang butuh sesi user.
- `InferenceService`: lapisan terpisah agar tim AI bisa mengganti provider/model tanpa mengubah endpoint.

## Struktur

```text
Back_end/
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

3. Salin `.env.example` menjadi `.env`, lalu sesuaikan bila perlu.
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
