from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import base64
import numpy as np
from typing import Optional, List, Dict, Any
import logging
import os
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("visiongate-ai")

app = FastAPI(
    title="VisionGate AI Service",
    description="AI-powered surveillance and analytics for smart residential communities",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DetectionRequest(BaseModel):
    image: str  # base64 encoded image

class FaceRequest(BaseModel):
    image: str

class ChatbotRequest(BaseModel):
    query: str
    context: Optional[List[Dict[str, str]]] = []

class AnomalyRequest(BaseModel):
    data: Dict[str, Any]

class PriorityRequest(BaseModel):
    category: str
    description: str
    resident_history: Optional[Dict[str, Any]] = {}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "VisionGate AI",
        "timestamp": datetime.now().isoformat(),
        "models": {
            "object_detection": "yolov8n (simulated)",
            "face_recognition": "available (simulated)",
            "anomaly_detection": "isolation_forest (simulated)",
            "priority_prediction": "bert-classifier (simulated)",
            "chatbot": "rag-gpt (simulated)",
        },
    }

@app.post("/detect")
async def detect_objects(request: DetectionRequest):
    """Object detection using YOLOv8 (simulated)."""
    try:
        # In production, this would run YOLOv8 inference
        # img_data = base64.b64decode(request.image)
        # nparr = np.frombuffer(img_data, np.uint8)
        # img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        # results = model(img)
        # detections = results.xyxy[0].cpu().numpy()

        return {
            "success": True,
            "detections": [
                {"label": "person", "confidence": 0.95, "bbox": [100, 150, 200, 350]},
                {"label": "car", "confidence": 0.88, "bbox": [300, 200, 450, 300]},
            ],
            "object_count": 2,
            "people_count": 1,
            "vehicles": 1,
            "model": "yolov8n",
            "processing_time_ms": 45,
        }
    except Exception as e:
        logger.error(f"Detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recognize-face")
async def recognize_face(request: FaceRequest):
    """Face recognition service (simulated)."""
    try:
        return {
            "success": True,
            "matches": [
                {
                    "name": "John Resident",
                    "confidence": 0.92,
                    "flat_number": "A-201",
                    "tower": "A",
                    "is_resident": True,
                }
            ],
            "unknown": False,
            "processing_time_ms": 32,
        }
    except Exception as e:
        logger.error(f"Face recognition error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-anomaly")
async def detect_anomaly(request: AnomalyRequest):
    """Anomaly detection for security events."""
    try:
        data = request.data
        score = 0.0
        is_anomaly = False
        reason = "Normal activity"

        # Simple heuristic anomaly detection
        if data.get("hour", 12) < 5 or data.get("hour", 12) > 23:
            score += 0.3
            reason = "Unusual time of day"

        if data.get("visit_frequency", 0) > 5:
            score += 0.2
            reason = "High visit frequency"

        if data.get("is_blacklisted", False):
            score += 0.5
            reason = "Blacklisted individual detected"

        is_anomaly = score > 0.4

        return {
            "success": True,
            "is_anomaly": is_anomaly,
            "anomaly_score": round(score, 2),
            "reason": reason,
            "recommendation": "Flag for review" if is_anomaly else "No action needed",
        }
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-priority")
async def predict_priority(request: PriorityRequest):
    """AI-powered complaint priority prediction."""
    try:
        keywords = {
            "critical": ["fire", "gas", "electric shock", "flood", "emergency", "broken elevator"],
            "high": ["leak", "power outage", "no water", "security breach", "broken lock"],
            "medium": ["noise", "cleaning", "pest", "painting", "plumbing"],
        }

        desc = request.description.lower()
        for priority, words in keywords.items():
            if any(word in desc for word in words):
                return {
                    "priority": priority,
                    "confidence": 0.85,
                    "category": request.category,
                    "estimated_resolution_hours": 2 if priority == "critical" else 8 if priority == "high" else 48,
                }

        return {
            "priority": "low",
            "confidence": 0.65,
            "category": request.category,
            "estimated_resolution_hours": 72,
        }
    except Exception as e:
        logger.error(f"Priority prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chatbot")
async def chatbot(request: ChatbotRequest):
    """RAG-based AI chatbot for resident assistance."""
    try:
        query = request.query.lower()

        responses = {
            "visitor": "You can view and manage your visitors from the Visitors section. To pre-register a visitor, click 'Add Visitor' and fill in their details. They'll receive a QR code for seamless entry.",
            "complaint": "Submit complaints through the Complaints portal. Track the status of your complaints in real-time. Once resolved, you can provide feedback.",
            "maintenance": "View your maintenance schedule and make payments via UPI, credit card, or net banking from the Maintenance section. Late payments may incur additional fees.",
            "amenity": "Book community amenities like the clubhouse, swimming pool, gym, and sports courts. Check availability and reserve your preferred time slot.",
            "emergency": "In case of emergency, use the SOS button on your dashboard. This immediately alerts security personnel and broadcasts to all residents.",
            "security": "VisionGate uses AI-powered surveillance with real-time monitoring, object detection, and facial recognition to ensure community safety.",
            "payment": "You can pay maintenance fees, amenity booking fees, and other dues online using UPI, credit/debit cards, or net banking.",
            "profile": "You can update your profile information, notification preferences, and security settings from your account settings.",
        }

        response = None
        for key, reply in responses.items():
            if key in query:
                response = reply
                break

        if not response:
            response = (
                "I'm your VisionGate AI assistant. I can help with:\n"
                "- Visitor management & pre-registration\n"
                "- Complaint submission & tracking\n"
                "- Maintenance fee payments\n"
                "- Amenity bookings\n"
                "- Emergency/SOS alerts\n"
                "- Security & surveillance info\n\n"
                "What would you like help with?"
            )

        return {
            "reply": response,
            "confidence": 0.92,
            "context_used": bool(request.context),
            "model": "visiongate-rag-v1",
        }
    except Exception as e:
        logger.error(f"Chatbot error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-crowd")
async def analyze_crowd(request: DetectionRequest):
    """Crowd density analysis simulation."""
    try:
        import random
        density = random.uniform(0.1, 0.9)
        status = "low"
        if density > 0.7:
            status = "high"
        elif density > 0.4:
            status = "medium"

        return {
            "success": True,
            "crowd_density": round(density, 2),
            "status": status,
            "people_estimate": int(density * 50),
            "alert": status == "high",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
