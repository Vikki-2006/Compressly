from pydantic import BaseModel

class SettingsUpdate(BaseModel):
    default_preset: str
    cleanup_threshold_seconds: str
    output_format: str
    default_crf: str
    enable_watermark: str
    watermark_text: str
