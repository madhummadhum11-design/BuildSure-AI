import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AlertModel
from app.schemas import AlertCreate, AlertUpdate, AlertResponse

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertResponse], summary="List all incident & sensor alerts")
def list_alerts(
    site: Optional[str] = Query(None, description="Filter by construction site"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Active, Acknowledged, Resolved, Dismissed)"),
    alert_type: Optional[str] = Query(None, alias="type", description="Filter by alert type (critical, high, medium, info)"),
    db: Session = Depends(get_db)
):
    """Retrieve all incident and sensor triage alerts with optional filters."""
    query = db.query(AlertModel)

    if site and site != "All Sites":
        query = query.filter(AlertModel.site == site)
    if status_filter:
        query = query.filter(AlertModel.status == status_filter)
    if alert_type:
        query = query.filter(AlertModel.type == alert_type)

    return query.order_by(AlertModel.created_at.desc()).all()


@router.get("/{alert_id}", response_model=AlertResponse, summary="Get alert by ID")
def get_alert(alert_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a single alert record."""
    alert = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found."
        )
    return alert


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED, summary="Create a new alert")
def create_alert(alert_in: AlertCreate, db: Session = Depends(get_db)):
    """Dispatch a new sensor or incident alert into the database triage queue."""
    alert_id = alert_in.id or f"ALT-{random.randint(400, 9999)}"

    existing = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An alert with ID '{alert_id}' already exists."
        )

    alert_obj = AlertModel(
        id=alert_id,
        hazard_id=alert_in.hazard_id,
        title=alert_in.title,
        desc=alert_in.desc,
        site=alert_in.site,
        time=alert_in.time,
        type=alert_in.type.lower(),
        status=alert_in.status
    )

    db.add(alert_obj)
    db.commit()
    db.refresh(alert_obj)
    return alert_obj


@router.patch("/{alert_id}", response_model=AlertResponse, summary="Update an alert status")
def update_alert(alert_id: str, alert_update: AlertUpdate, db: Session = Depends(get_db)):
    """Acknowledge, resolve, or edit an alert entry."""
    alert_obj = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not alert_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found."
        )

    update_data = alert_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field == "type" and val:
            val = val.lower()
        setattr(alert_obj, field, val)

    db.commit()
    db.refresh(alert_obj)
    return alert_obj


@router.delete("/{alert_id}", summary="Delete or dismiss an alert")
def delete_alert(alert_id: str, db: Session = Depends(get_db)):
    """Permanently delete an alert from the triage queue."""
    alert_obj = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not alert_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found."
        )

    db.delete(alert_obj)
    db.commit()
    return {"status": "success", "message": f"Alert '{alert_id}' successfully deleted.", "id": alert_id}
