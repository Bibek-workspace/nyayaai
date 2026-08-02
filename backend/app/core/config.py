"""Application configuration loaded from environment variables."""
from functools import lru_cache
from typing import List, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "NyayaAI"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Security
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBED_MODEL: str = "text-embedding-3-large"
    EMBED_DIM: int = 3072

    # S3 / Object storage
    S3_ENDPOINT_URL: str | None = None
    S3_BUCKET: str = "nyayaai-documents"
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    S3_REGION: str = "ap-south-1"

    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "no-reply@nyayaai.in"
    EMAIL_FROM_NAME: str = "NyayaAI"

    # SMS
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    # OCR
    TESSERACT_CMD: str = "/usr/bin/tesseract"
    OCR_LANGUAGES: str = "eng+hin"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            if v.startswith("["):
                import json
                try:
                    return json.loads(v)
                except:
                    return v.strip('[]').split(",")
            else:
                return [o.strip() for o in v.split(",") if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
