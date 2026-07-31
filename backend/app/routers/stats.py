from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.analytics.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/stats", tags=["stats"])

@router.get("")
def get_statistics(db: Session = Depends(get_db)):
    """Calculates conversions volume, success ratios, and disk space saved using AnalyticsService."""
    service = AnalyticsService(db)
    return service.compute_dashboard_analytics()
