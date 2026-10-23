# SITEGUARD AI - FastAPI Backend Foundation

Production-ready, beginner-friendly REST API foundation for the **SITEGUARD AI** autonomous construction safety monitoring system.

---

## 🛠 Technology Stack
- **Framework:** FastAPI (Python 3.13 / 3.14)
- **Database:** SQLite (file-based `siteguard.db`, tables created automatically on startup)
- **ORM:** SQLAlchemy 2.0+
- **Validation:** Pydantic v2 (models aliased for 100% frontend React camelCase compatibility)
- **ASGI Server:** Uvicorn
- **Testing:** Pytest & HTTPX TestClient

---

## 📁 Directory Structure
```
backend/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules for venv, sqlite, pycache
├── requirements.txt          # Python dependencies
├── README.md                 # Setup & API documentation
├── siteguard.db              # SQLite database (auto-generated on startup)
├── app/
│   ├── __init__.py           # Application package
│   ├── config.py             # Pydantic settings & CORS configuration
│   ├── database.py           # SQLite connection engine & session dependency
│   ├── models.py             # SQLAlchemy persistent database models
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── main.py               # FastAPI entry point & lifespan handler
│   └── routers/
│       ├── __init__.py
│       ├── health.py         # GET /api/health (DB connectivity & counts)
│       ├── hazards.py        # Complete CRUD for site hazards
│       └── alerts.py         # Complete CRUD for incident & sensor alerts
└── tests/
    ├── __init__.py
    └── test_api.py           # Pytest test suite with in-memory DB
```

---

## 🚀 Quick Start (Windows PowerShell)

### 1. Create and Activate Virtual Environment
Open PowerShell and navigate to the backend directory:
```powershell
cd D:\BuildSure\BuildSure-AI\backend

# Create virtual environment using Python 3.13 or 3.14
py -3.13 -m venv .venv

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1
```
*(If PowerShell restricts script execution, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Configure Environment Variables (Optional)
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

### 4. Run the Development Server
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Once started:
- **Interactive Swagger Docs:** [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)
- **Alternative ReDoc Docs:** [http://127.0.0.1:8000/api/redoc](http://127.0.0.1:8000/api/redoc)
- **System Health:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## 🧪 Running Automated Tests
Run the automated pytest suite (runs against an isolated in-memory SQLite database):
```powershell
pytest -v tests
```

---

## 📡 API Endpoints Reference

### Health & Status
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Root metadata and links to documentation |
| `GET` | `/api/health` | Live database connectivity status, table counts & timestamp |

### Hazards API (`/api/hazards`)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/hazards` | List hazards (supports `?site=`, `?status=`, `?severity=`, `?category=`) |
| `GET` | `/api/hazards/{hazard_id}` | Retrieve single hazard details by ID |
| `POST` | `/api/hazards` | Create hazard (auto-calculates risk score and priority if omitted) |
| `PATCH`| `/api/hazards/{hazard_id}` | Partial update (status, severity, recommendations) |
| `DELETE`| `/api/hazards/{hazard_id}` | Delete hazard by ID |

### Alerts API (`/api/alerts`)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/alerts` | List alerts (supports `?site=`, `?status=`, `?type=`) |
| `GET` | `/api/alerts/{alert_id}` | Retrieve single alert by ID |
| `POST` | `/api/alerts` | Create incident or sensor alert |
| `PATCH`| `/api/alerts/{alert_id}` | Update alert status (`Active`, `Acknowledged`, `Resolved`, `Dismissed`) |
| `DELETE`| `/api/alerts/{alert_id}` | Delete alert by ID |
