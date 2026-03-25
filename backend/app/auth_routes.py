import jwt
from datetime import datetime, timedelta
from flask import Blueprint, current_app, jsonify, request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from .extensions import db
from .models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")


def generate_token(user_id: int) -> str:
    """Generate a JWT token for a user"""
    token_expiry = int(current_app.config.get("TOKEN_EXPIRY", 86400))
    secret_key = current_app.config.get("SECRET_KEY", "change-this-secret")
    payload = {
        "userId": user_id,
        "exp": datetime.utcnow() + timedelta(seconds=token_expiry),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, secret_key, algorithm="HS256")


def verify_token(token: str) -> dict | None:
    """Verify and decode a JWT token"""
    secret_key = current_app.config.get("SECRET_KEY", "change-this-secret")
    try:
        return jwt.decode(token, secret_key, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


@auth_bp.post("/signup")
def signup():
    """Register a new user with email and password"""
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    name = data.get("name", "").strip()

    # Validation
    if not email or "@" not in email:
        return jsonify({"error": "Invalid email"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if not name:
        return jsonify({"error": "Name is required"}), 400

    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    # Create new user
    user = User(
        email=email,
        name=name,
        login_method="email",
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id)

    return (
        jsonify({
            "token": token,
            "userId": user.id,
            "email": user.email,
            "name": user.name,
            "avatar": user.avatar_url,
        }),
        201,
    )


@auth_bp.post("/login")
def login():
    """Login with email and password"""
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"error": "Account inactive"}), 403

    token = generate_token(user.id)

    return jsonify({
        "token": token,
        "userId": user.id,
        "email": user.email,
        "name": user.name,
        "avatar": user.avatar_url,
    })


@auth_bp.post("/google")
def google_login():
    """Login or register with Google ID token after official verification."""
    data = request.get_json(silent=True) or {}
    token = data.get("token", "").strip()

    if not token:
        return jsonify({"error": "Google token required"}), 400

    configured_client_ids = [
        cid.strip()
        for cid in (current_app.config.get("GOOGLE_CLIENT_ID") or "").split(",")
        if cid.strip()
    ]
    if not configured_client_ids:
        return jsonify({"error": "Google OAuth is not configured on server"}), 500

    id_info = None
    verification_error = "Token verification failed"
    request_adapter = google_requests.Request()
    for client_id in configured_client_ids:
        try:
            id_info = google_id_token.verify_oauth2_token(
                token,
                request_adapter,
                audience=client_id,
            )
            break
        except Exception as exc:
            verification_error = str(exc)

    if not id_info:
        return jsonify({"error": verification_error}), 401

    if not id_info.get("email_verified", False):
        return jsonify({"error": "Google account email is not verified"}), 401

    email = (id_info.get("email") or "").strip().lower()
    name = (id_info.get("name") or "Google User").strip()
    avatar = id_info.get("picture")
    google_sub = id_info.get("sub")

    if not email or not google_sub:
        return jsonify({"error": "Google token missing required claims"}), 401

    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(
            email=email,
            name=name,
            avatar_url=avatar,
            login_method="google",
            google_id=google_sub,
        )
        db.session.add(user)
        db.session.commit()
    else:
        user.name = name or user.name
        user.avatar_url = avatar or user.avatar_url
        user.login_method = "google"
        user.google_id = google_sub
        db.session.commit()

    session_token = generate_token(user.id)
    return jsonify({
        "token": session_token,
        "userId": user.id,
        "email": user.email,
        "name": user.name,
        "avatar": user.avatar_url,
    })


@auth_bp.get("/me")
def get_current_user():
    """Get current logged-in user info"""
    auth_header = request.headers.get("Authorization", "").strip()

    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized"}), 401

    token = auth_header[7:]  # Remove "Bearer " prefix
    payload = verify_token(token)

    if not payload:
        return jsonify({"error": "Invalid or expired token"}), 401

    user = User.query.get(payload.get("userId"))

    if not user or not user.is_active:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "userId": user.id,
        "email": user.email,
        "name": user.name,
        "avatar": user.avatar_url,
    })
