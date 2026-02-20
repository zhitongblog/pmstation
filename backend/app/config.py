"""Application configuration."""
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # App
    app_name: str = "PMStation"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/pmstation"

    # JWT
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    # Gemini API
    gemini_api_key: str = ""

    # CORS - can be comma-separated string or JSON array
    cors_origins: str = "http://localhost:3000"

    def get_cors_origins(self) -> list[str]:
        """Parse CORS origins from string or JSON."""
        import json
        origins = self.cors_origins
        if origins.startswith("["):
            try:
                return json.loads(origins)
            except:
                pass
        return [o.strip() for o in origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
