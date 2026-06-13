import os
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from supabase import create_client, Client
import datetime

# Load environment variables
load_dotenv()

app = FastAPI(title="StraightPosturizer API", version="1.0.0")

# Enable CORS for Next.js frontend running locally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client if credentials exist
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase client initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")
else:
    print("Warning: Supabase credentials not found in environment variables. Running in mock mode.")

# --- Pydantic Schemas ---

class SettingsSchema(BaseModel):
    user_id: str
    sensitivity: int = 5
    alert_delay: int = 3
    alert_visual: bool = True
    alert_audio: bool = True
    audio_type: str = "bell"

class SessionCreateSchema(BaseModel):
    user_id: str
    start_time: str
    end_time: str
    total_duration: int = 0
    good_posture_duration: int = 0
    alert_count: int = 0

# --- API Routes ---

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "supabase_connected": supabase is not None}

@app.get("/api/settings/{user_id}", response_model=SettingsSchema)
def get_settings(user_id: str):
    """
    Retrieve user custom settings.
    """
    if supabase:
        try:
            response = supabase.table("user_settings").select("*").eq("user_id", user_id).execute()
            if response.data:
                return response.data[0]
            else:
                # Return default settings if none exist
                return SettingsSchema(user_id=user_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Mock default settings for local dev
        return SettingsSchema(user_id=user_id)

@app.post("/api/settings/{user_id}")
def update_settings(user_id: str, settings: Dict[str, Any]):
    """
    Save or update user settings.
    """
    # Build complete settings dict using inputs, filling with defaults
    settings_dict = {
        "user_id": user_id,
        "sensitivity": settings.get("sensitivity", 5),
        "alert_delay": settings.get("alert_delay", 3),
        "alert_visual": settings.get("alert_visual", True),
        "alert_audio": settings.get("alert_audio", True),
        "audio_type": settings.get("audio_type", "bell")
    }

    if supabase:
        try:
            # Upsert settings into Supabase
            response = supabase.table("user_settings").upsert(settings_dict).execute()
            return {"message": "Settings saved successfully", "data": response.data}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Mock success for local dev
        return {"message": "Settings saved successfully (Mock)", "data": settings_dict}

@app.post("/api/sessions", status_code=status.HTTP_201_CREATED)
def save_session(session: SessionCreateSchema):
    """
    Save details of a finished posture session.
    """
    session_data = session.model_dump()

    if not session_data["user_id"]:
        raise HTTPException(status_code=400, detail="Missing user_id")

    if supabase:
        try:
            response = supabase.table("posture_sessions").insert(session_data).execute()
            return {"message": "Session saved successfully", "data": response.data}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Mock success for local dev
        return {"message": "Session saved successfully (Mock)", "data": session_data}

@app.get("/api/sessions/{user_id}")
def get_sessions(user_id: str):
    """
    Retrieve all historical sessions for a user.
    """
    if supabase:
        try:
            response = supabase.table("posture_sessions").select("*").eq("user_id", user_id).order("start_time", desc=True).execute()
            return response.data
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Mock historical data for local dev
        today = datetime.date.today()
        mock_sessions = [
            {
                "id": 1,
                "user_id": user_id,
                "start_time": (today - datetime.timedelta(days=2)).isoformat() + "T09:00:00",
                "end_time": (today - datetime.timedelta(days=2)).isoformat() + "T10:00:00",
                "total_duration": 3600,
                "good_posture_duration": 3240,  # 90% good
                "alert_count": 5
            },
            {
                "id": 2,
                "user_id": user_id,
                "start_time": (today - datetime.timedelta(days=1)).isoformat() + "T14:00:00",
                "end_time": (today - datetime.timedelta(days=1)).isoformat() + "T15:30:00",
                "total_duration": 5400,
                "good_posture_duration": 4320,  # 80% good
                "alert_count": 12
            },
            {
                "id": 3,
                "user_id": user_id,
                "start_time": today.isoformat() + "T10:00:00",
                "end_time": today.isoformat() + "T11:00:00",
                "total_duration": 3600,
                "good_posture_duration": 3420,  # 95% good
                "alert_count": 2
            }
        ]
        return mock_sessions

if __name__ == "__main__":
    import uvicorn
    # Host on 0.0.0.0 and port 5000 for standard local communication
    uvicorn.run(app, host="0.0.0.0", port=5000)

