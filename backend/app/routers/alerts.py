import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AlertModel, UserModel
from app.schemas import AlertCreate, AlertUpdate, AlertResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertResponse], summary="List all incident & sensor alerts")
def list_alerts(
    site: Optional[str] = Query(None, description="Filter by construction site"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Active, Acknowledged, Resolved, Dismissed)"),
    alert_type: Optional[str] = Query(None, alias="type", description="Filter by alert type (critical, high, medium, info)"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
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
def get_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve details for a single alert record."""
    alert = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found."
        )
    return alert


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED, summary="Create a new alert")
def create_alert(
    alert_in: AlertCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Dispatch a new sensor or incident alert into the database triage queue."""
    alert_id = alert_in.id or f"ALT-{random.randint(400, 9999)}"

    existing = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An alert with ID '{alert_id}' already exists."
        )

    db_alert = AlertModel(
        id=alert_id,
        hazard_id=alert_in.hazard_id,
        title=alert_in.title,
        desc=alert_in.desc,
        site=alert_in.site,
        time=alert_in.time or "Just now",
        type=alert_in.type.lower(),
        status=alert_in.status
    )

    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert


@router.patch("/{alert_id}", response_model=AlertResponse, summary="Update an alert")
def update_alert(
    alert_id: str,
    alert_in: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Update fields on an existing alert (e.g. acknowledge, resolve, or re-categorize)."""
    db_alert = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not db_alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found."
        )

    update_dict = alert_in.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if hasattr(db_alert, field):
            setattr(db_alert, field, val)

    db.commit()
    db.refresh(db_alert)
    return db_alert


@router.delete("/{alert_id}", status_code=status.HTTP_200_OK, summary="Dismiss/delete an alert")
def delete_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Dismiss and remove an alert from the active triage queue."""
    db_alert = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not db_alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found."
        )

    db.delete(db_alert)
    db.commit()
    return {"status": "ok", "message": f"Alert '{alert_id}' was dismissed.", "id": alert_id}
