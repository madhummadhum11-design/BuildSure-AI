# SITEGUARD AI — Enterprise Construction Risk Intelligence Platform

**SITEGUARD AI** is a full-stack, enterprise-grade construction safety intelligence platform designed for civil engineering contractors, site superintendents, safety directors, and college project demonstrations. It integrates real-time local computer vision object detection (YOLOv8) with incident triage, actuarial risk scoring, and auditable reporting.

---

## Key Features

1. **Public Landing & Authentication Page**
   - High-impact enterprise interface: *"Smarter Construction. Safer Sites."*
   - Interactive login with show/hide password, live validation, and 1-click evaluator demo login.
   - Comprehensive public overview: 3-step *"How SITEGUARD AI Works"*, interface preview window, 5 core capabilities highlight, value pillars, and mandatory safety disclaimer.
   - User account registration with selectable roles.

2. **Five Primary Features After Login**
   - **Dashboard Command Center**: Multi-site portfolio telemetry, overall risk summaries, open & critical hazard counters, active sensor alerts, and 1-click autonomous risk sweep simulation.
   - **AI Photo Risk Analyzer**: Direct local YOLOv8 neural network inference running on actual uploaded image pixels, bounding box annotations, detected class breakdowns, and safety guidance.
   - **Hazard Management**: Full incident registry backed by SQLite database. Register new hazards, inspect severity and likelihood matrix, and resolve or reopen incidents with full audit trails.
   - **Safety Alerts Center**: Prioritized incident triage queue, real-time alert dispatching for high/critical threats, and auditable acknowledgment tracking.
   - **Executive Reports**: Production-grade report generation with one-click PDF dossiers, actuarial summaries, CSV hazard tables, and complete JSON telemetry exports.

3. **Secure Authentication & Data Protection**
   - Real PyJWT signed tokens with 24-hour expiration (`HS256`).
   - Secure password hashing using industry-standard `bcrypt`.
   - SQLite persistent database (`UserModel`, `HazardModel`, `AlertModel`).
   - Private API endpoints protected with HTTP Bearer token dependency.
   - Automatic seeding of evaluator demo account on backend startup.

---

## Evaluator / Demo Account Credentials

For mentors and college project evaluators, the backend automatically seeds a default demo account upon startup:

- **Corporate Email:** `demo@siteguard.ai`
- **Password:** `SiteGuard2026!`
- **Role:** `Director of Safety Operations`
- **Convenience Feature:** Click the **"Fill Evaluator Demo Credentials"** button on the login card to autofill instantly.

---

## System Architecture

```
BuildSure-AI/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entry & lifespan startup
│   │   ├── config.py                # Pydantic v2 settings & JWT configuration
│   │   ├── database.py              # SQLAlchemy engine & SQLite session factory
│   │   ├── models.py                # SQLAlchemy ORM models (User, Hazard, Alert)
│   │   ├── schemas.py               # Pydantic validation schemas & computed fields
│   │   ├── routers/
│   │   │   ├── auth.py              # Register, login, /me, logout & get_current_user
│   │   │   ├── hazards.py           # Authenticated hazard CRUD endpoints
│   │   │   ├── alerts.py            # Authenticated alert triage & acknowledgment
│   │   │   └── vision.py            # YOLOv8 vision pipeline & pixel inference
│   │   └── services/
│   │       ├── auth_service.py      # bcrypt hashing & PyJWT token generator
│   │       └── yolo_service.py      # Ultralytics YOLOv8 local model inference
│   ├── tests/
│   │   └── test_api.py              # Complete pytest suite (16 comprehensive tests)
│   ├── requirements.txt             # Python dependencies
│   ├── yolov8n.pt                   # Local YOLOv8 weights file
│   └── .env.example                 # Environment variables template
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── PublicLandingPage.jsx # Public landing & authentication interface
    │   ├── services/
    │   │   └── api.js               # REST client, JWT token storage, normalizers
    │   ├── utils/
    │   │   └── exportUtils.js       # PDF, CSV, JSON export engines
    │   ├── App.jsx                  # Main application shell & 5 core views
    │   ├── App.css                  # Enterprise design system styles
    │   └── index.css                # Global tokens & CSS variables
    └── package.json                 # React + Vite dependencies
```

---

## Installation & Setup Instructions

### 1. Prerequisites
- **Python:** 3.10 to 3.13
- **Node.js:** v18+ and `npm`

### 2. Backend Setup
```bash
# Navigate to backend folder
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run backend test suite (all 16 tests pass)
pytest -v tests/test_api.py

# Launch FastAPI development server (runs at http://127.0.0.1:8000)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# In a new terminal, navigate to frontend folder
cd frontend

# Install npm packages
npm install

# Run frontend build verification
npm run build

# Launch Vite development server (runs at http://127.0.0.1:5173)
npm run dev
```

---

## Backend Environment Variables (`backend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `HOST` | `127.0.0.1` | Local backend bind address |
| `PORT` | `8000` | Backend API port |
| `DATABASE_URL` | `sqlite:///./siteguard.db` | SQLite database filepath |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | CORS allowed origins |
| `JWT_SECRET_KEY` | *(Set in config)* | Secret HMAC key for signing JWTs |
| `JWT_ALGORITHM` | `HS256` | Token signing algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Session lifetime (24 hours) |
| `DEMO_USER_EMAIL` | `demo@siteguard.ai` | Evaluator demo email |
| `DEMO_USER_PASSWORD` | `SiteGuard2026!` | Evaluator demo password |

---

## API Endpoints Reference

### Public Endpoints
- `GET /` — API service root status
- `GET /api/health` — Health check, database connectivity, and telemetry counts
- `GET /api/vision/status` — YOLOv8 model loading status and supported classes
- `POST /api/auth/register` — Register a new user account
- `POST /api/auth/login` — Authenticate credentials and receive Bearer JWT token

### Protected Endpoints (`Authorization: Bearer <token>`)
- `GET /api/auth/me` — Retrieve current authenticated user profile
- `POST /api/auth/logout` — Logout user session
- `GET /api/hazards` — List logged hazards (filterable by site, severity, status)
- `POST /api/hazards` — Register a new construction hazard
- `PATCH /api/hazards/{id}` — Update hazard details or resolve status
- `DELETE /api/hazards/{id}` — Delete a hazard record
- `GET /api/alerts` — List incident triage alerts
- `POST /api/alerts` — Dispatch an alert
- `PATCH /api/alerts/{id}` — Acknowledge or update alert status
- `DELETE /api/alerts/{id}` — Dismiss an alert
- `POST /api/vision/analyze` — Multipart image upload for local YOLOv8 object detection

---

## Safety & AI Assessment Disclaimer

> **IMPORTANT NOTICE:** SITEGUARD AI analysis and computer vision object detections support preliminary risk assessment and informational triage only. General object detection does not independently establish a safety violation. This platform does not replace professional on-site inspections by certified safety engineers, statutory OSHA 1926 compliance audits, or mandatory structural engineering certifications.