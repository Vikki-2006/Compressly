from sqlalchemy.orm import Session
from app.models.settings import SettingsModel

class SettingsRepository:
    def __init__(self, db: Session):
        self.db = db
        
    def get(self, key: str) -> str:
        """Queries the setting value for a given key."""
        entry = self.db.query(SettingsModel).filter(SettingsModel.key == key).first()
        return entry.value if entry else None
        
    def get_all(self) -> dict:
        """Fetches all configuration key/value pairs in a single dictionary."""
        entries = self.db.query(SettingsModel).all()
        return {entry.key: entry.value for entry in entries}
        
    def set(self, key: str, value: str) -> SettingsModel:
        """Sets or updates a setting configuration value."""
        entry = self.db.query(SettingsModel).filter(SettingsModel.key == key).first()
        if entry:
            entry.value = value
        else:
            entry = SettingsModel(key=key, value=value)
            self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry
        
    def initialize_defaults(self):
        """Pre-populates the database with initial settings keys if empty."""
        defaults = {
            "default_preset": "medium",
            "cleanup_threshold_seconds": "1800",
            "output_format": "mp4",
            "default_crf": "23",
            "enable_watermark": "false",
            "watermark_text": "Compressly"
        }
        for key, val in defaults.items():
            if not self.get(key):
                self.set(key, val)
