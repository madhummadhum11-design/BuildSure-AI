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
