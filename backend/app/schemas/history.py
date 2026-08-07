from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HistoryBase(BaseModel):
    id: str
    filename: str
    original_size: int
    compressed_size: Optional[int] = None
    duration: float
    saved_percentage: Optional[float] = None
    compression_time: Optional[float] = None
    created_at: datetime
    status: str
    task_type: str

    class Config:
        from_attributes = True  # Adaptable with SQLAlchemy models (Pydantic v2 style)
