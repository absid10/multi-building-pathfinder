import os
from datetime import datetime
from flask import Blueprint, jsonify
from .config import Config

debug_bp = Blueprint("debug", __name__, url_prefix="/api/v1/debug")

@debug_bp.get("/status")
def get_debug_status():
    """Return system status for deployment verification."""
    return jsonify({
        "status": "online",
        "version": "1.1.0-sync-ai-fixed",
        "timestamp": datetime.utcnow().isoformat(),
        "config": {
            "gemini_api_key_set": bool(Config.GEMINI_API_KEY),
            "openai_api_key_set": bool(Config.OPENAI_API_KEY),
            "upload_folder_exists": os.path.exists(Config.UPLOAD_FOLDER),
        },
        "message": "If you see version 1.1.0, the latest code is live."
    })
