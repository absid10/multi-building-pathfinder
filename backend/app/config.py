import os


def _normalize_database_url(url: str) -> str:
    normalized = (url or "").strip()
    if not normalized:
        return "sqlite:///hospital_nav.db"

    # Render and some providers still emit postgres:// URLs.
    if normalized.startswith("postgres://"):
        return normalized.replace("postgres://", "postgresql+psycopg://", 1)

    # Keep modern postgres URLs compatible with psycopg3.
    if normalized.startswith("postgresql://") and "+" not in normalized.split("://", 1)[0]:
        return normalized.replace("postgresql://", "postgresql+psycopg://", 1)

    return normalized


class Config:
    SQLALCHEMY_DATABASE_URI = _normalize_database_url(os.getenv("DATABASE_URL", ""))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret")
    TOKEN_EXPIRY = int(os.getenv("TOKEN_EXPIRY", "86400"))
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
