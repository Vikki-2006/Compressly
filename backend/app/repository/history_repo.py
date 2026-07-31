from sqlalchemy.orm import Session
from app.models.history import HistoryModel
from datetime import datetime, timezone

class HistoryRepository:
    def __init__(self, db: Session):
        self.db = db
        
    def get_by_id(self, task_id: str) -> HistoryModel:
        """Retrieves a single history entry by its ID."""
        return self.db.query(HistoryModel).filter(HistoryModel.id == task_id).first()
        
    def get_all(self):
        """Fetches all history rows sorted by descending creation time."""
        return self.db.query(HistoryModel).order_by(HistoryModel.created_at.desc()).all()
        
    def add(
        self, 
        task_id: str, 
        filename: str, 
        original_size: int, 
        duration: float, 
        status: str = "pending", 
        task_type: str = "compression"
    ) -> HistoryModel:
        """Inserts a new record into the history table."""
        entry = HistoryModel(
            id=task_id,
            filename=filename,
            original_size=original_size,
            duration=duration,
            status=status,
            task_type=task_type,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry
        
    def update(
        self, 
        task_id: str, 
        compressed_size: int = None, 
        saved_percentage: float = None, 
        compression_time: float = None, 
        status: str = None
    ) -> HistoryModel:
        """Updates a record inside the history table when compression completes or fails."""
        entry = self.get_by_id(task_id)
        if entry:
            if compressed_size is not None:
                entry.compressed_size = compressed_size
            if saved_percentage is not None:
                entry.saved_percentage = saved_percentage
            if compression_time is not None:
                entry.compression_time = compression_time
            if status is not None:
                entry.status = status
            self.db.commit()
            self.db.refresh(entry)
        return entry
        
    def delete(self, task_id: str) -> bool:
        """Removes a row from the history table."""
        entry = self.get_by_id(task_id)
        if entry:
            self.db.delete(entry)
            self.db.commit()
            return True
        return False
