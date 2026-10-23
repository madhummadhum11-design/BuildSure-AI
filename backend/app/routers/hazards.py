import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import HazardModel
from app.schemas import HazardCreate, HazardUpdate, HazardResponse

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
    db: Session = Depends(get_db)
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
def get_hazard(hazard_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a single construction hazard by its ID."""
    hazard = db.query(HazardModel).filter(HazardModel.id == hazard_id).first()
    if not hazard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hazard with ID '{hazard_id}' not found."
        )
    return hazard


@router.post("", response_model=HazardResponse, status_code=status.HTTP_201_CREATED, summary="Create a new hazard")
def create_hazard(hazard_in: HazardCreate, db: Session = Depends(get_db)):
    """Log a new hazard into the persistent database registry."""
    # Generate ID if not provided
    hazard_id = hazard_in.id or f"HAZ-{random.randint(1000, 9999)}"

    # Check for existing ID conflict
    existing = db.query(HazardModel).filter(HazardModel.id == hazard_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A hazard with ID '{hazard_id}' already exists."
        )

    # Compute risk score if not provided
    score = hazard_in.risk_score
    if score is None:
        score = calculate_risk_score(hazard_in.numeric_severity, hazard_in.numeric_likelihood)

    # Derive priority and severity alignment
    priority = hazard_in.priority or determine_priority_from_score(score)
    severity = hazard_in.severity or priority

    hazard_obj = HazardModel(
        id=hazard_id,
        site=hazard_in.site,
        hazard=hazard_in.hazard,
        category=hazard_in.category,
        numeric_severity=hazard_in.numeric_severity,
        numeric_likelihood=hazard_in.numeric_likelihood,
        risk_score=score,
        severity=severity,
        priority=priority,
        status=hazard_in.status,
        category_recommendation=hazard_in.category_recommendation,
        priority_guidance=hazard_in.priority_guidance,
        reported_by=hazard_in.reported_by,
        timestamp=hazard_in.timestamp
    )

    db.add(hazard_obj)
    db.commit()
    db.refresh(hazard_obj)
    return hazard_obj


@router.patch("/{hazard_id}", response_model=HazardResponse, summary="Update an existing hazard")
def update_hazard(hazard_id: str, hazard_update: HazardUpdate, db: Session = Depends(get_db)):
    """Partially update an existing hazard (status change, severity escalation, recommendation edits)."""
    hazard_obj = db.query(HazardModel).filter(HazardModel.id == hazard_id).first()
    if not hazard_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hazard with ID '{hazard_id}' not found."
        )

    update_data = hazard_update.model_dump(exclude_unset=True)

    # Apply updates
    for field, val in update_data.items():
        setattr(hazard_obj, field, val)

    # Re-evaluate score if severity or likelihood changed without explicit score override
    if ("numeric_severity" in update_data or "numeric_likelihood" in update_data) and "risk_score" not in update_data:
        hazard_obj.risk_score = calculate_risk_score(hazard_obj.numeric_severity, hazard_obj.numeric_likelihood)

    db.commit()
    db.refresh(hazard_obj)
    return hazard_obj


@router.delete("/{hazard_id}", summary="Delete a hazard")
def delete_hazard(hazard_id: str, db: Session = Depends(get_db)):
    """Delete a hazard from the database registry."""
    hazard_obj = db.query(HazardModel).filter(HazardModel.id == hazard_id).first()
    if not hazard_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hazard with ID '{hazard_id}' not found."
        )

    db.delete(hazard_obj)
    db.commit()
    return {"status": "success", "message": f"Hazard '{hazard_id}' successfully deleted.", "id": hazard_id}
