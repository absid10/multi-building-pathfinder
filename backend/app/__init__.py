import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from .auth_routes import auth_bp
from .config import Config
from .extensions import db, migrate
from .map_upload_routes import map_upload_bp
from .routes import api


def _cors_origins_from_env() -> list[str]:
    configured = os.getenv("CORS_ORIGIN", "").strip()
    default_origins = [
        r"http://localhost:\\d+",
        r"http://127\\.0\\.0\\.1:\\d+",
        r"http://192\\.168\\.\\d+\\.\\d+:\\d+",
        r"https://.*\\.vercel\\.app",
    ]
    if not configured:
        return default_origins

    explicit = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return explicit + default_origins


def create_app() -> Flask:
    load_dotenv()

    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(
        app,
        resources={r"/api/*": {"origins": _cors_origins_from_env()}},
    )

    db.init_app(app)
    migrate.init_app(app, db)

    app.register_blueprint(api)
    app.register_blueprint(auth_bp)
    app.register_blueprint(map_upload_bp)

    @app.get("/")
    def root():
        return {
            "service": "smart-hospital-navigation-api",
            "version": "1.0.0",
            "status": "running",
        }

    return app
