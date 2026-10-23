import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.services import auth_service
from app.config import settings

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
    """Create all tables and seed demo user before each test, and drop them after."""
    Base.metadata.create_all(bind=test_engine)
    with TestingSessionLocal() as db:
        auth_service.seed_demo_user(db)
    yield
    Base.metadata.drop_all(bind=test_engine)


def get_auth_headers(email: str = settings.DEMO_USER_EMAIL, password: str = settings.DEMO_USER_PASSWORD):
    """Helper to authenticate and return Bearer token headers."""
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Auth login failed: {res.text}"
    token = res.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


# -----------------------------------------------------------------------------
# 1. Health & Root Endpoint Tests (Public)
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
    assert "auth" in data["endpoints"]


# -----------------------------------------------------------------------------
# 2. Authentication & Authorization Route Protection Tests
# -----------------------------------------------------------------------------

def test_unauthenticated_requests_rejected():
    """Verify that private API routes strictly reject unauthenticated requests with 401."""
    # Hazards
    res_h = client.get("/api/hazards")
    assert res_h.status_code == 401

    res_h_create = client.post("/api/hazards", json={"site": "Site A", "hazard": "Test Hazard"})
    assert res_h_create.status_code == 401

    # Alerts
    res_a = client.get("/api/alerts")
    assert res_a.status_code == 401

    # Vision Analysis
    res_v = client.post("/api/vision/analyze", files={"image": ("test.jpg", b"fake", "image/jpeg")})
    assert res_v.status_code == 401


def test_register_and_login_flow():
    """Test user registration, login, and current user retrieval."""
    reg_payload = {
        "email": "inspector.smith@siteguard.ai",
        "password": "SecurePassword2026!",
        "fullName": "Inspector Smith",
        "role": "Lead Safety Inspector"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "accessToken" in reg_data
    assert reg_data["user"]["email"] == "inspector.smith@siteguard.ai"
    assert reg_data["user"]["fullName"] == "Inspector Smith"

    # Login with newly registered credentials
    login_res = client.post("/api/auth/login", json={
        "email": "inspector.smith@siteguard.ai",
        "password": "SecurePassword2026!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["accessToken"]

    # Verify /api/auth/me profile
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "inspector.smith@siteguard.ai"


def test_login_invalid_credentials_rejected():
    res = client.post("/api/auth/login", json={
        "email": settings.DEMO_USER_EMAIL,
        "password": "WrongPassword!"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


def test_register_duplicate_email_rejected():
    res = client.post("/api/auth/register", json={
        "email": settings.DEMO_USER_EMAIL,
        "password": "SomePassword123!"
    })
    assert res.status_code == 409
    assert "already registered" in res.json()["detail"]


# -----------------------------------------------------------------------------
# 3. Hazard CRUD & Scoring Tests (Authenticated)
# -----------------------------------------------------------------------------

def test_create_and_get_hazard():
    headers = get_auth_headers()
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
    response = client.post("/api/hazards", json=payload, headers=headers)
    assert response.status_code == 201
    created = response.json()
    assert created["id"] == "HAZ-TEST-01"
    assert created["site"] == "Riverside Bridge Expansion"
    # Auto-calculated score: 5 * 5 * 4 = 100
    assert created["riskScore"] == 100
    assert created["severity"] == "Critical"
    assert created["status"] == "Open"

    # Fetch by ID
    get_res = client.get("/api/hazards/HAZ-TEST-01", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["hazard"] == payload["hazard"]


def test_create_hazard_duplicate_conflict():
    headers = get_auth_headers()
    payload = {
        "id": "HAZ-DUP-01",
        "site": "Metro Heights Tower A",
        "hazard": "PPE Missing Harness",
        "category": "Fall risk"
    }
    res1 = client.post("/api/hazards", json=payload, headers=headers)
    assert res1.status_code == 201

    res2 = client.post("/api/hazards", json=payload, headers=headers)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_list_and_filter_hazards():
    headers = get_auth_headers()
    client.post("/api/hazards", json={
        "id": "HAZ-A",
        "site": "Site Alpha",
        "hazard": "Exposed Wiring",
        "category": "Electrical hazard",
        "numericSeverity": 4,
        "numericLikelihood": 3
    }, headers=headers)
    client.post("/api/hazards", json={
        "id": "HAZ-B",
        "site": "Site Beta",
        "hazard": "Blocked Fire Exit",
        "category": "Egress hazard",
        "numericSeverity": 2,
        "numericLikelihood": 2
    }, headers=headers)

    # List all
    all_res = client.get("/api/hazards", headers=headers)
    assert all_res.status_code == 200
    assert len(all_res.json()) == 2

    # Filter by site
    alpha_res = client.get("/api/hazards?site=Site Alpha", headers=headers)
    assert alpha_res.status_code == 200
    assert len(alpha_res.json()) == 1
    assert alpha_res.json()[0]["id"] == "HAZ-A"


def test_update_and_delete_hazard():
    headers = get_auth_headers()
    client.post("/api/hazards", json={
        "id": "HAZ-UPDATE-ME",
        "site": "Site Gamma",
        "hazard": "Ladders Unsecured",
        "numericSeverity": 3,
        "numericLikelihood": 3,
        "status": "Open"
    }, headers=headers)

    # Patch status to Resolved
    patch_res = client.patch(
        "/api/hazards/HAZ-UPDATE-ME",
        json={"status": "Resolved"},
        headers=headers
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "Resolved"

    # Delete
    del_res = client.delete("/api/hazards/HAZ-UPDATE-ME", headers=headers)
    assert del_res.status_code == 200

    # Ensure 404 after delete
    get_res = client.get("/api/hazards/HAZ-UPDATE-ME", headers=headers)
    assert get_res.status_code == 404


def test_hazard_validation_error():
    headers = get_auth_headers()
    # Missing required site and hazard text
    res = client.post("/api/hazards", json={"numericSeverity": 10}, headers=headers)
    assert res.status_code == 422


# -----------------------------------------------------------------------------
# 4. Alert Lifecycle Tests (Authenticated)
# -----------------------------------------------------------------------------

def test_alert_lifecycle():
    headers = get_auth_headers()
    payload = {
        "id": "ALT-TEST-99",
        "title": "High Crane Wind Velocity Warning",
        "desc": "Wind sensor gust exceeded threshold envelope.",
        "site": "Riverside Bridge Expansion",
        "type": "critical",
        "status": "Active"
    }
    create_res = client.post("/api/alerts", json=payload, headers=headers)
    assert create_res.status_code == 201
    assert create_res.json()["id"] == "ALT-TEST-99"

    # List alerts
    list_res = client.get("/api/alerts", headers=headers)
    assert list_res.status_code == 200
    assert any(a["id"] == "ALT-TEST-99" for a in list_res.json())

    # Acknowledge alert
    ack_res = client.patch("/api/alerts/ALT-TEST-99", json={"status": "Acknowledged"}, headers=headers)
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "Acknowledged"

    # Dismiss / Delete alert
    del_res = client.delete("/api/alerts/ALT-TEST-99", headers=headers)
    assert del_res.status_code == 200

    # Verify not found
    get_res = client.get("/api/alerts/ALT-TEST-99", headers=headers)
    assert get_res.status_code == 404


# -----------------------------------------------------------------------------
# 5. Computer Vision Inference Tests
# -----------------------------------------------------------------------------

def test_vision_status():
    """Verify vision model metadata status endpoint (Public check)."""
    response = client.get("/api/vision/status")
    assert response.status_code == 200
    data = response.json()
    assert "available" in data
    assert "model" in data
    assert "supportedClassesCount" in data
    assert data["supportedClassesCount"] > 0
    assert "person" in data["sampleClasses"]


def test_vision_analyze_valid_image():
    """Verify inference pipeline successfully analyzes a real constructed test image."""
    headers = get_auth_headers()
    img = Image.new("RGB", (640, 480), color=(128, 128, 128))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    image_bytes = img_byte_arr.getvalue()

    response = client.post(
        "/api/vision/analyze",
        files={"image": ("test_site.jpg", image_bytes, "image/jpeg")},
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "inferenceTimeMs" in data
    assert "detectionsCount" in data
    assert "cautiousRiskLevel" in data
    assert "hazards" in data
    assert "modelDisclaimer" in data
    assert "annotatedImage" in data


def test_vision_analyze_corrupt_image():
    """Verify corrupt image streams are rejected safely."""
    headers = get_auth_headers()
    corrupt_bytes = b"NotAValidImageFileHeaderData"
    response = client.post(
        "/api/vision/analyze",
        files={"image": ("broken.jpg", corrupt_bytes, "image/jpeg")},
        headers=headers
    )
    assert response.status_code == 400
    assert "Corrupt, invalid, or unsupported image format" in response.json()["detail"]


def test_vision_analyze_empty_image():
    """Verify 0-byte uploads are rejected with informative 400."""
    headers = get_auth_headers()
    response = client.post(
        "/api/vision/analyze",
        files={"image": ("empty.jpg", b"", "image/jpeg")},
        headers=headers
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]
