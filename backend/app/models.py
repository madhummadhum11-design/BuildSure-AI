from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, func
from app.database import Base


class HazardModel(Base):
    """SQLAlchemy persistent model for construction site hazards."""

    __tablename__ = "hazards"

    id = Column(String(50), primary_key=True, index=True)
    site = Column(String(120), nullable=False, index=True)
    hazard = Column(String(255), nullable=False)
    category = Column(String(80), nullable=False, default="General")
    numeric_severity = Column(Integer, nullable=False, default=3)
    numeric_likelihood = Column(Integer, nullable=False, default=3)
    risk_score = Column(Integer, nullable=False, default=36)
    severity = Column(String(30), nullable=False, default="Medium")
    priority = Column(String(30), nullable=False, default="Medium")
    status = Column(String(40), nullable=False, default="Open")
    category_recommendation = Column(Text, nullable=True)
    priority_guidance = Column(Text, nullable=True)
    reported_by = Column(String(120), nullable=True, default="Site Supervisor")
    timestamp = Column(String(80), nullable=True, default="Just now")

    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)


class AlertModel(Base):
    """SQLAlchemy persistent model for sensor telemetry, drone flags & incident alerts."""

    __tablename__ = "alerts"

    id = Column(String(50), primary_key=True, index=True)
    hazard_id = Column(String(50), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    desc = Column(Text, nullable=False)
    site = Column(String(120), nullable=False, index=True)
    time = Column(String(80), nullable=True, default="Just now")
    type = Column(String(30), nullable=False, default="medium")  # critical, high, medium, info
    status = Column(String(40), nullable=False, default="Active")  # Active, Acknowledged, Resolved, Dismissed

    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
