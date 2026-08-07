from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.repository.settings_repo import SettingsRepository
from app.schemas.settings import SettingsUpdate

router = APIRouter(prefix="/api/settings")


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    """Fetches all configuration key/value pairs from database settings table."""
    repo = SettingsRepository(db)
    repo.initialize_defaults()
    return repo.get_all()


@router.post("")
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    """Saves updated settings values inside the SQLite database settings table."""
    repo = SettingsRepository(db)
    repo.set("default_preset", payload.default_preset)
    repo.set("cleanup_threshold_seconds", payload.cleanup_threshold_seconds)
    repo.set("output_format", payload.output_format)
    repo.set("default_crf", payload.default_crf)
    repo.set("enable_watermark", payload.enable_watermark)
    repo.set("watermark_text", payload.watermark_text)
    return {"status": "success", "message": "Settings saved successfully."}
