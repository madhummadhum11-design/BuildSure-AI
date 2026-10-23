from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, computed_field


# -----------------------------------------------------------------------------
# Hazard Schemas
# -----------------------------------------------------------------------------

class HazardBase(BaseModel):
    site: str = Field(..., min_length=2, max_length=120, description="Site or project name")
    hazard: str = Field(..., min_length=3, max_length=255, description="Hazard description or condition")
    category: str = Field(default="General", max_length=80, description="Hazard category")
    numeric_severity: int = Field(default=3, ge=1, le=5, alias="numericSeverity")
    numeric_likelihood: int = Field(default=3, ge=1, le=5, alias="numericLikelihood")
    risk_score: Optional[int] = Field(default=None, ge=0, le=100, alias="riskScore")
    severity: Optional[str] = Field(default=None, description="Low, Medium, High, or Critical")
    priority: Optional[str] = Field(default=None, description="Low, Medium, High, or Critical")
    status: str = Field(default="Open", description="Open, In Review, Investigating, Work Paused, Resolved, Closed")
    category_recommendation: Optional[str] = Field(default=None, alias="categoryRecommendation")
    priority_guidance: Optional[str] = Field(default=None, alias="priorityGuidance")
    reported_by: Optional[str] = Field(default="Site Supervisor", alias="reportedBy")
    timestamp: Optional[str] = Field(default="Just now")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


class HazardCreate(HazardBase):
    id: Optional[str] = Field(default=None, max_length=50, description="Custom ID e.g. HAZ-1082 (auto-generated if omitted)")


class HazardUpdate(BaseModel):
    site: Optional[str] = Field(default=None, max_length=120)
    hazard: Optional[str] = Field(default=None, max_length=255)
    category: Optional[str] = Field(default=None, max_length=80)
    numeric_severity: Optional[int] = Field(default=None, ge=1, le=5, alias="numericSeverity")
    numeric_likelihood: Optional[int] = Field(default=None, ge=1, le=5, alias="numericLikelihood")
    risk_score: Optional[int] = Field(default=None, ge=0, le=100, alias="riskScore")
    severity: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    category_recommendation: Optional[str] = Field(default=None, alias="categoryRecommendation")
    priority_guidance: Optional[str] = Field(default=None, alias="priorityGuidance")
    reported_by: Optional[str] = Field(default=None, alias="reportedBy")
    timestamp: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


class HazardResponse(HazardBase):
    id: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


# -----------------------------------------------------------------------------
# Alert Schemas
# -----------------------------------------------------------------------------

class AlertBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    desc: str = Field(..., min_length=2)
    site: str = Field(..., min_length=2, max_length=120)
    hazard_id: Optional[str] = Field(default=None, max_length=50, alias="hazardId")
    time: Optional[str] = Field(default="Just now")
    type: str = Field(default="medium", description="critical, high, medium, info")
    status: str = Field(default="Active", description="Active, Acknowledged, Resolved, Dismissed")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


class AlertCreate(AlertBase):
    id: Optional[str] = Field(default=None, max_length=50, description="Custom ID e.g. ALT-401 (auto-generated if omitted)")


class AlertUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    desc: Optional[str] = None
    site: Optional[str] = Field(default=None, max_length=120)
    hazard_id: Optional[str] = Field(default=None, max_length=50, alias="hazardId")
    time: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


class AlertResponse(AlertBase):
    id: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


# -----------------------------------------------------------------------------
# Health Schema
# -----------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    app: str
    environment: str
    database: str
    hazards_count: int
    alerts_count: int
    timestamp: str


# -----------------------------------------------------------------------------
# Vision AI Schemas
# -----------------------------------------------------------------------------

class VisionDetectionItem(BaseModel):
    id: str
    name: str
    class_name: str = Field(alias="className")
    category: str
    severity: str
    numeric_severity: int = Field(default=3, alias="numericSeverity")
    numeric_likelihood: int = Field(default=3, alias="numericLikelihood")
    location: str
    confidence: float
    explanation: str
    recommendation: str
    bbox: List[float] = Field(description="[x1, y1, x2, y2] bounding box coordinates")
    normalized_bbox: Optional[List[float]] = Field(default=None, alias="normalizedBbox")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


class VisionAnalysisResponse(BaseModel):
    status: str
    mode: str = "live"
    model: str
    inference_time_ms: float = Field(alias="inferenceTimeMs")
    summary: str
    detections_count: int = Field(alias="detectionsCount")
    cautious_risk_level: str = Field(alias="cautiousRiskLevel")
    risk_score: int = Field(default=0, alias="riskScore")
    hazards: List[VisionDetectionItem]
    annotated_image: Optional[str] = Field(default=None, alias="annotatedImage")
    model_disclaimer: str = Field(alias="modelDisclaimer")
    timestamp: str

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


class VisionStatusResponse(BaseModel):
    available: bool
    model: str
    supported_classes_count: int = Field(alias="supportedClassesCount")
    sample_classes: List[str] = Field(alias="sampleClasses")
    device: str

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


# -----------------------------------------------------------------------------
# User & Authentication Schemas
# -----------------------------------------------------------------------------

class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=4, max_length=150, description="Valid email address")
    password: str = Field(..., min_length=6, max_length=100, description="User password (min 6 characters)")
    full_name: Optional[str] = Field(default="Safety Inspector", alias="fullName")
    role: Optional[str] = Field(default="Director of Safety Operations")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool = True
    created_at: datetime

    @computed_field
    @property
    def fullName(self) -> str:
        return self.full_name

    @computed_field
    @property
    def isActive(self) -> bool:
        return self.is_active

    @computed_field
    @property
    def createdAt(self) -> datetime:
        return self.created_at

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    @computed_field
    @property
    def accessToken(self) -> str:
        return self.access_token

    @computed_field
    @property
    def tokenType(self) -> str:
        return self.token_type

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )

