from sqlalchemy import Column, String, Integer, Float, DateTime
from datetime import datetime, timezone
from app.database.connection import Base


class HistoryModel(Base):
    __tablename__ = "history"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_size = Column(Integer, nullable=False)
    compressed_size = Column(Integer, nullable=True)
    duration = Column(Float, nullable=False)
    saved_percentage = Column(Float, nullable=True)
    compression_time = Column(Float, nullable=True)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )
    status = Column(String, nullable=False)
    task_type = Column(
        String, default="compression"
    )  # "compression", "gif_conversion", "audio_extraction", "watermark"
    preset_used = Column(String, nullable=True, default="balanced")
    video_codec = Column(String, nullable=True, default="h264")
    resolution = Column(String, nullable=True, default="1080p")
    output_filename = Column(String, nullable=True)
    saved_mb = Column(Float, nullable=True, default=0.0)
    ffmpeg_log = Column(String, nullable=True)
