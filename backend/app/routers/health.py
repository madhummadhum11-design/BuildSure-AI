from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import HazardModel, AlertModel
from app.schemas import HealthResponse

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse, summary="Check backend health and database connectivity")
def get_health(db: Session = Depends(get_db)):
    """Validates application health and verifies live SQLite database connection."""
    try:
        # Check database connectivity
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connectivity check failed: {str(exc)}"
        )

    try:
        hazards_count = db.query(HazardModel).count()
        alerts_count = db.query(AlertModel).count()
    except Exception:
        hazards_count = 0
        alerts_count = 0

    return HealthResponse(
        status="ok",
        app=settings.APP_NAME,
        environment=settings.APP_ENV,
        database=db_status,
        hazards_count=hazards_count,
        alerts_count=alerts_count,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
