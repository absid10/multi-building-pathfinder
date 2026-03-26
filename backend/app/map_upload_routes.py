import os
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import Blueprint, jsonify, request
from .extensions import db
from .models import User, UploadedMap
from .auth_routes import verify_token
from .services.queue import get_analysis_queue
from .services.map_analysis_jobs import analyze_uploaded_map_job

map_upload_bp = Blueprint("map_upload", __name__, url_prefix="/api/v1/maps")

UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename: str) -> bool:
    """Check if file has allowed extension"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_current_user_from_request():
    """Extract and verify user from Authorization header"""
    auth_header = request.headers.get("Authorization", "").strip()

    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]  # Remove "Bearer " prefix
    payload = verify_token(token)

    if not payload:
        return None

    user = User.query.get(payload.get("userId"))
    return user if user and user.is_active else None


@map_upload_bp.post("/upload")
def upload_map():
    """Upload and analyze a map"""
    user = get_current_user_from_request()

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    # Check if file is in request
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Validate file
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed. Use PNG, JPG, or PDF."}), 400

    if len(file.read()) > MAX_FILE_SIZE:
        file.seek(0)
        return jsonify({"error": f"File too large. Max size is {MAX_FILE_SIZE / 1024 / 1024}MB"}), 413

    file.seek(0)  # Reset file pointer

    # Save file
    filename = secure_filename(file.filename)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    saved_filename = f"{user.id}_{timestamp}_{filename}"
    file_path = os.path.join(UPLOAD_FOLDER, saved_filename)

    try:
        file.save(file_path)
    except Exception as e:
        return jsonify({"error": f"File save failed: {str(e)}"}), 500

    # Create uploaded map record (status: analyzing)
    uploaded_map = UploadedMap(
        user_id=user.id,
        name=filename,
        original_filename=filename,
        file_path=file_path,
        status="analyzing",
    )

    db.session.add(uploaded_map)
    db.session.commit()

    # Queue async AI analysis job.
    try:
        queue = get_analysis_queue()
        job = queue.enqueue(analyze_uploaded_map_job, uploaded_map.id)
        uploaded_map.analysis_job_id = job.id
        db.session.commit()
    except Exception as exc:
        # Fallback: run analysis inline if Redis/RQ is unavailable.
        # This keeps uploads usable in local/dev environments.
        uploaded_map.analysis_job_id = None
        db.session.commit()
        analyze_uploaded_map_job(uploaded_map.id)
        uploaded_map = UploadedMap.query.get(uploaded_map.id)
        if uploaded_map and uploaded_map.status == "error":
            uploaded_map.error_message = (
                f"Queue unavailable; inline analysis failed: {uploaded_map.error_message}"
            )
            db.session.commit()
            return jsonify(uploaded_map.to_dict()), 500

        uploaded_map = UploadedMap.query.get(uploaded_map.id)
        if uploaded_map:
            uploaded_map.error_message = None
            db.session.commit()

    return jsonify(uploaded_map.to_dict()), 201


@map_upload_bp.get("/<int:map_id>/status")
def map_status(map_id: int):
    uploaded_map = UploadedMap.query.get_or_404(map_id)
    return jsonify(
        {
            "id": uploaded_map.id,
            "status": uploaded_map.status,
            "analysisJobId": uploaded_map.analysis_job_id,
            "error": uploaded_map.error_message,
            "buildingCount": uploaded_map.building_count,
            "floorCount": uploaded_map.floor_count,
        }
    )


@map_upload_bp.get("/list")
def list_user_maps():
    """Get all maps uploaded by current user"""
    user = get_current_user_from_request()

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    maps = UploadedMap.query.filter_by(user_id=user.id).order_by(
        UploadedMap.created_at.desc()
    ).all()

    return jsonify([m.to_dict() for m in maps])


@map_upload_bp.get("/public")
def list_public_maps():
    """Get all public maps (accessible without authentication)"""
    maps = UploadedMap.query.filter_by(is_public=True, status="analyzed").order_by(
        UploadedMap.created_at.desc()
    ).all()

    return jsonify([
        {
            "id": m.id,
            "name": m.name,
            "uploadedBy": m.user.name if m.user else "Unknown",
            "buildingCount": m.building_count,
            "floorCount": m.floor_count,
            "thumbnail": m.thumbnail_path,
            "uploadDate": m.created_at.isoformat(),
        }
        for m in maps
    ])


@map_upload_bp.patch("/<int:map_id>/privacy")
def update_map_privacy(map_id: int):
    """Toggle map privacy (public/private)"""
    user = get_current_user_from_request()

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    uploaded_map = UploadedMap.query.get_or_404(map_id)

    # Verify ownership
    if uploaded_map.user_id != user.id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    is_public = data.get("isPublic", uploaded_map.is_public)

    uploaded_map.is_public = is_public
    db.session.commit()

    return jsonify(uploaded_map.to_dict())


@map_upload_bp.delete("/<int:map_id>")
def delete_map(map_id: int):
    """Delete an uploaded map"""
    user = get_current_user_from_request()

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    uploaded_map = UploadedMap.query.get_or_404(map_id)

    # Verify ownership
    if uploaded_map.user_id != user.id:
        return jsonify({"error": "Forbidden"}), 403

    # Delete file from disk
    try:
        if os.path.exists(uploaded_map.file_path):
            os.remove(uploaded_map.file_path)
    except Exception as e:
        print(f"Error deleting file: {e}")

    db.session.delete(uploaded_map)
    db.session.commit()

    return jsonify({"message": "Map deleted successfully"})
