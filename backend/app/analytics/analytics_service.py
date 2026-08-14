from app.repository.history_repo import HistoryRepository
from sqlalchemy.orm import Session


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.history_repo = HistoryRepository(db)

    def compute_dashboard_analytics(self) -> dict:
        """Aggregate stats logs from history logs."""
        logs = self.history_repo.get_all()

        total_processed = len(logs)
        completed_logs = [log for log in logs if log.status == "completed"]
        failed_logs = [log for log in logs if log.status == "failed"]

        total_original_bytes = sum(log.original_size for log in completed_logs)
        total_compressed_bytes = sum(log.compressed_size or 0 for log in completed_logs)

        total_saved_bytes = total_original_bytes - total_compressed_bytes
        total_saved_gb = (
            round(total_saved_bytes / (1024**3), 3) if total_saved_bytes > 0 else 0.0
        )

        # Average savings ratio calculation
        avg_savings_pct = 0.0
        if completed_logs:
            pcts = [
                log.saved_percentage
                for log in completed_logs
                if log.saved_percentage is not None
            ]
            avg_savings_pct = round(sum(pcts) / len(pcts), 1) if pcts else 0.0

        # Extra metrics: Average elapsed compression time
        durations = [log.duration for log in completed_logs if log.duration is not None]
        avg_duration_seconds = (
            round(sum(durations) / len(durations), 1) if durations else 0.0
        )

        return {
            "total_processed": total_processed,
            "completed_count": len(completed_logs),
            "failed_count": len(failed_logs),
            "total_original_size_mb": round(total_original_bytes / (1024**2), 1),
            "total_compressed_size_mb": round(total_compressed_bytes / (1024**2), 1),
            "total_saved_bytes": total_saved_bytes,
            "total_saved_gb": total_saved_gb,
            "average_reduction_percentage": avg_savings_pct,
            "average_duration_seconds": avg_duration_seconds,
        }
