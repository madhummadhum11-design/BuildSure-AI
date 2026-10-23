from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, SessionLocal, Base
from app.services import auth_service
from app.routers import health, auth, hazards, alerts, vision


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler: creates database tables and seeds demo account on startup."""
    # Create SQLite database tables if they do not exist
    Base.metadata.create_all(bind=engine)

    # Seed demo account for mentors and evaluators
    with SessionLocal() as db:
        auth_service.seed_demo_user(db)

    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="REST API foundation for the SITEGUARD AI autonomous construction safety system.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# CORS Middleware configured strictly for local development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(hazards.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(vision.router, prefix="/api")


@app.get("/", tags=["Root"])
def root_status():
    """Root metadata endpoint with pointers to documentation and health status."""
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "version": "1.0.0",
        "docs": "/api/docs",
        "health": "/api/health",
        "endpoints": {
            "auth": {
                "login": "/api/auth/login",
                "register": "/api/auth/register",
                "me": "/api/auth/me"
            },
            "hazards": "/api/hazards",
            "alerts": "/api/alerts",
            "vision": "/api/vision/analyze",
            "vision_status": "/api/vision/status"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
