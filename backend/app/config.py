from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application Settings loaded from environment variables or .env file."""

    APP_NAME: str = "SITEGUARD AI Backend"
    APP_ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    DATABASE_URL: str = "sqlite:///./siteguard.db"

    # Comma-separated or list of allowed origins
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Authentication & JWT Security Settings
    JWT_SECRET_KEY: str = Field(
        default="siteguard-enterprise-jwt-secret-key-2026-production",
        description="Cryptographic secret key for signing JWT tokens"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Seeded Demo Account for Evaluation / Mentors
    DEMO_USER_EMAIL: str = "demo@siteguard.ai"
    DEMO_USER_PASSWORD: str = "SiteGuard2026!"
    DEMO_USER_NAME: str = "A. Morgan"
    DEMO_USER_ROLE: str = "Director of Safety Operations"

    # Optional Vision AI Provider Secret
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API key kept securely server-side")

    # Local YOLO Computer Vision Settings
    YOLO_MODEL_PATH: str = Field(default="yolov8n.pt", description="Path or model name for Ultralytics YOLO object detection")
    VISION_CONFIDENCE_THRESHOLD: float = Field(default=0.25, description="Minimum confidence threshold for object detection")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["http://localhost:5173", "http://127.0.0.1:5173"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
