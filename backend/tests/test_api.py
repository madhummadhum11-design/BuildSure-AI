import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

# Create in-memory SQLite database for isolated test execution
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Create all tables before each test and drop them after."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


# -----------------------------------------------------------------------------
# 1. Health Endpoint Tests
# -----------------------------------------------------------------------------

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert "hazards_count" in data
    assert "alerts_count" in data
    assert "timestamp" in data


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["health"] == "/api/health"


# -----------------------------------------------------------------------------
# 2. Hazard CRUD & Scoring Tests
# -----------------------------------------------------------------------------

def test_create_and_get_hazard():
    payload = {
        "id": "HAZ-TEST-01",
        "site": "Riverside Bridge Expansion",
        "hazard": "Unanchored Perimeter Scaffolding at Pier 3",
        "category": "Structural hazard",
        "numericSeverity": 5,
        "numericLikelihood": 5,
        "status": "Open",
        "categoryRecommendation": "Restrict access immediately.",
        "reportedBy": "Safety Inspector"
    }
    response = client.post("/api/hazards", json=payload)
    assert response.status_code == 201
    created = response.json()
    assert created["id"] == "HAZ-TEST-01"
    assert created["site"] == "Riverside Bridge Expansion"
    # Auto-calculated score: 5 * 5 * 4 = 100
    assert created["riskScore"] == 100
    assert created["severity"] == "Critical"
    assert created["status"] == "Open"

    # Fetch by ID
    get_res = client.get("/api/hazards/HAZ-TEST-01")
    assert get_res.status_code == 200
    assert get_res.json()["hazard"] == payload["hazard"]


def test_create_hazard_duplicate_conflict():
    payload = {
        "id": "HAZ-DUP-01",
        "site": "Metro Heights Tower A",
        "hazard": "PPE Missing Harness",
        "category": "Fall risk"
    }
    res1 = client.post("/api/hazards", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/hazards", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_list_and_filter_hazards():
    # Insert two hazards across different sites
    client.post("/api/hazards", json={
        "id": "HAZ-A",
        "site": "Site Alpha",
        "hazard": "Exposed Wiring",
        "category": "Electrical hazard",
        "numericSeverity": 4,
        "numericLikelihood": 3
    })
    client.post("/api/hazards", json={
        "id": "HAZ-B",
        "site": "Site Beta",
        "hazard": "Blocked Fire Exit",
        "category": "Egress hazard",
        "numericSeverity": 2,
        "numericLikelihood": 2
    })

    # List all
    all_res = client.get("/api/hazards")
    assert all_res.status_code == 200
    assert len(all_res.json()) == 2

    # Filter by site
    alpha_res = client.get("/api/hazards?site=Site Alpha")
    assert alpha_res.status_code == 200
    assert len(alpha_res.json()) == 1
    assert alpha_res.json()[0]["id"] == "HAZ-A"


def test_update_and_delete_hazard():
    client.post("/api/hazards", json={
        "id": "HAZ-UPDATE-ME",
        "site": "Site Gamma",
        "hazard": "Ladders Unsecured",
        "numericSeverity": 3,
        "numericLikelihood": 3,
        "status": "Open"
    })

    # Partial update: resolve status
    patch_res = client.patch("/api/hazards/HAZ-UPDATE-ME", json={"status": "Resolved"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "Resolved"

    # Delete
    del_res = client.delete("/api/hazards/HAZ-UPDATE-ME")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Verify not found
    get_res = client.get("/api/hazards/HAZ-UPDATE-ME")
    assert get_res.status_code == 404


def test_hazard_validation_error():
    # Missing required 'hazard' condition description
    response = client.post("/api/hazards", json={"site": "Valid Site"})
    assert response.status_code == 422


# -----------------------------------------------------------------------------
# 3. Alert CRUD Tests
# -----------------------------------------------------------------------------

def test_alert_lifecycle():
    alert_payload = {
        "id": "ALT-TEST-99",
        "hazardId": "HAZ-1082",
        "title": "High Wind Warning",
        "desc": "Crane operations suspended due to wind gusts.",
        "site": "Riverside Bridge Expansion",
        "type": "critical",
        "status": "Active"
    }
    # Create
    create_res = client.post("/api/alerts", json=alert_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["id"] == "ALT-TEST-99"
    assert created["type"] == "critical"

    # List
    list_res = client.get("/api/alerts?type=critical")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Patch: acknowledge
    patch_res = client.patch("/api/alerts/ALT-TEST-99", json={"status": "Acknowledged"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "Acknowledged"

    # Delete
    del_res = client.delete("/api/alerts/ALT-TEST-99")
    assert del_res.status_code == 200

    # Verify 404
    assert client.get("/api/alerts/ALT-TEST-99").status_code == 404


# -----------------------------------------------------------------------------
# 4. Computer Vision Inference Tests
# -----------------------------------------------------------------------------

def test_vision_status():
    response = client.get("/api/vision/status")
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is True
    assert "YOLOv8" in data["model"]
    assert data["supportedClassesCount"] == 80
    assert "person" in data["sampleClasses"]


def test_vision_analyze_valid_image():
    import io
    import numpy as np
    import cv2

    # Create synthetic test image
    img = np.full((300, 400, 3), 180, dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", img)

    files = {"image": ("site_inspection.jpg", io.BytesIO(buf.tobytes()), "image/jpeg")}
    response = client.post("/api/vision/analyze", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["mode"] == "live"
    assert "YOLOv8" in data["model"]
    assert "inferenceTimeMs" in data
    assert "detectionsCount" in data
    assert "cautiousRiskLevel" in data
    assert "modelDisclaimer" in data
    assert isinstance(data["hazards"], list)
    assert data["annotatedImage"] is not None


def test_vision_analyze_corrupt_image():
    import io
    bad_files = {"image": ("corrupted.jpg", io.BytesIO(b"not an image file data"), "image/jpeg")}
    response = client.post("/api/vision/analyze", files=bad_files)
    assert response.status_code == 400
    assert "Corrupt" in response.json()["detail"] or "invalid" in response.json()["detail"]


def test_vision_analyze_empty_image():
    import io
    empty_files = {"image": ("zero.jpg", io.BytesIO(b""), "image/jpeg")}
    response = client.post("/api/vision/analyze", files=empty_files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()
