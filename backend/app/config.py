import os


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "sqlite:///hospital_nav.db",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret")
    TOKEN_EXPIRY = int(os.getenv("TOKEN_EXPIRY", "86400"))
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
