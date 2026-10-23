import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import HazardModel, UserModel
from app.schemas import HazardCreate, HazardUpdate, HazardResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/hazards", tags=["Hazards"])


def calculate_risk_score(severity: int, likelihood: int) -> int:
    """Calculates deterministic risk score from 1-5 severity and likelihood."""
    sev = max(1, min(5, severity))
    lik = max(1, min(5, likelihood))
    return sev * lik * 4


def determine_priority_from_score(score: int) -> str:
    if score >= 75:
        return "Critical"
    if score >= 50:
        return "High"
    if score >= 25:
        return "Medium"
    return "Low"


@router.get("", response_model=List[HazardResponse], summary="List all site hazards")
def list_hazards(
    site: Optional[str] = Query(None, description="Filter by construction site"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Open, In Review, etc.)"),
    severity: Optional[str] = Query(None, description="Filter by severity (Critical, High, Medium, Low)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve all logged hazards with optional filtering by site, status, severity, or category."""
    query = db.query(HazardModel)

    if site and site != "All Sites":
        query = query.filter(HazardModel.site == site)
    if status_filter:
        query = query.filter(HazardModel.status == status_filter)
    if severity:
        query = query.filter(HazardModel.severity == severity)
    if category:
        query = query.filter(HazardModel.category == category)

    return query.order_by(HazardModel.created_at.desc()).all()


@router.get("/{hazard_id}", response_model=HazardResponse, summary="Get hazard by ID")
def get_hazard(
    hazard_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve details for a single construction hazard by its ID."""
    hazard = db.query(HazardModel).filter(HazardModel.id == hazard_id).first()
    if not hazard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hazard with ID '{hazard_id}' not found."
        )
    return hazard


@router.post("", response_model=HazardResponse, status_code=status.HTTP_201_CREATED, summary="Create a new hazard")
def create_hazard(
    hazard_in: HazardCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Log a new hazard into the persistent database registry."""
    # Generate ID if not provided
    hazard_id = hazard_in.id or f"HAZ-{random.randint(1000, 9999)}"

    # Check for duplicate ID
    existing = db.query(HazardModel).filter(HazardModel.id == hazard_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A hazard with ID '{hazard_id}' already exists."
        )

    # Compute deterministic score if not supplied
    computed_score = hazard_in.risk_score
    if computed_score is None:
        computed_score = calculate_risk_score(
            hazard_in.numeric_severity,
            hazard_in.numeric_likelihood
        )

    computed_priority = hazard_in.priority or determine_priority_from_score(computed_score)
    computed_severity = hazard_in.severity or computed_priority

    # Default reporter to current authenticated user's name if not explicitly set
    reporter = hazard_in.reported_by or current_user.full_name or "Site Safety Officer"

    db_hazard = HazardModel(
        id=hazard_id,
        site=hazard_in.site,
        hazard=hazard_in.hazard,
        category=hazard_in.category,
        numeric_severity=hazard_in.numeric_severity,
        numeric_likelihood=hazard_in.numeric_likelihood,
        risk_score=computed_score,
        severity=computed_severity,
        priority=computed_priority,
        status=hazard_in.status,
        category_recommendation=hazard_in.category_recommendation,
        priority_guidance=hazard_in.priority_guidance,
        reported_by=reporter,
        timestamp=hazard_in.timestamp or "Just now"
    )

    db.add(db_hazard)
    db.commit()
    db.refresh(db_hazard)
    return db_hazard


@router.patch("/{hazard_id}", response_model=HazardResponse, summary="Update an existing hazard")
def update_hazard(
    hazard_id: str,
    hazard_in: HazardUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Partially update fields on an existing hazard record (e.g. status transition or resolution)."""
    db_hazard = db.query(HazardModel).filter(HazardModel.id == hazard_id).first()
    if not db_hazard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hazard with ID '{hazard_id}' not found."
        )

    update_dict = hazard_in.model_dump(exclude_unset=True)

    # Re-calculate score if numeric severity or likelihood were updated
    if "numeric_severity" in update_dict or "numeric_likelihood" in update_dict:
        sev = update_dict.get("numeric_severity", db_hazard.numeric_severity)
        lik = update_dict.get("numeric_likelihood", db_hazard.numeric_likelihood)
        new_score = calculate_risk_score(sev, lik)
        db_hazard.risk_score = new_score
        db_hazard.priority = determine_priority_from_score(new_score)
        db_hazard.severity = db_hazard.priority

    for field, val in update_dict.items():
        if hasattr(db_hazard, field) and field not in ("risk_score", "priority", "severity"):
            setattr(db_hazard, field, val)

    db.commit()
    db.refresh(db_hazard)
    return db_hazard


@router.delete("/{hazard_id}", status_code=status.HTTP_200_OK, summary="Delete a hazard")
def delete_hazard(
    hazard_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Remove a hazard from the persistent registry."""
    db_hazard = db.query(HazardModel).filter(HazardModel.id == hazard_id).first()
    if not db_hazard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hazard with ID '{hazard_id}' not found."
        )

    db.delete(db_hazard)
    db.commit()
    return {"status": "ok", "message": f"Hazard '{hazard_id}' was successfully deleted.", "id": hazard_id}
