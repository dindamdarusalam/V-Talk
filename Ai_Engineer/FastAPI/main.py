from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from PIL import Image
import tensorflow as tf
import io

app = FastAPI(title="BISINDO Sign Language API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = tf.keras.models.load_model("model_bisindo.keras")

LABELS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224))
    img_array = np.array(img, dtype=np.float32)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

@app.get("/")
def root():
    return {"message": "BISINDO Sign Language API is running"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File harus berupa gambar")
    
    image_bytes = await file.read()
    
    try:
        img_array = preprocess_image(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal memproses gambar: {str(e)}")
    
    preds = model.predict(img_array, verbose=0)
    idx = int(np.argmax(preds[0]))
    confidence = float(np.max(preds[0])) * 100

    top3_idx = np.argsort(preds[0])[::-1][:3]
    top3 = [
        {"label": LABELS[i], "confidence": round(float(preds[0][i]) * 100, 2)}
        for i in top3_idx
    ]

    return {
        "predicted_label": LABELS[idx],
        "confidence": round(confidence, 2),
        "top3": top3
    }

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}