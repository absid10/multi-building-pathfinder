from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

from .extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(128), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=True)  # None if using OAuth
    name = db.Column(db.String(128), nullable=False)
    avatar_url = db.Column(db.String(512), nullable=True)
    login_method = db.Column(db.String(32), nullable=False, default="email")  # email or google
    google_id = db.Column(db.String(128), unique=True, nullable=True, index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    uploaded_maps = db.relationship("UploadedMap", back_populates="user", cascade="all, delete-orphan")

    def set_password(self, password: str):
        # Keep local auth responsive on low-end/dev machines.
        self.password_hash = generate_password_hash(
            password,
            method="pbkdf2:sha256:260000",
            salt_length=16,
        )

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password) if self.password_hash else False


class UploadedMap(TimestampMixin, db.Model):
    __tablename__ = "uploaded_maps"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(256), nullable=False)
    original_filename = db.Column(db.String(256), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    thumbnail_path = db.Column(db.String(512), nullable=True)
    analysis_job_id = db.Column(db.String(64), nullable=True, index=True)
    status = db.Column(db.String(32), nullable=False, default="analyzing")  # analyzing, analyzed, error
    error_message = db.Column(db.Text, nullable=True)
    is_public = db.Column(db.Boolean, nullable=False, default=False)
    building_count = db.Column(db.Integer, nullable=True)
    floor_count = db.Column(db.Integer, nullable=True)
    analysis_result = db.Column(db.JSON, nullable=True)  # Store detailed analysis results

    user = db.relationship("User", back_populates="uploaded_maps")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "analysisJobId": self.analysis_job_id,
            "isPublic": self.is_public,
            "buildingCount": self.building_count,
            "floorCount": self.floor_count,
            "uploadDate": self.created_at.isoformat(),
            "thumbnail": self.thumbnail_path,
            "error": self.error_message,
            "fileName": os.path.basename(self.file_path) if self.file_path else None,
        }


class Building(TimestampMixin, db.Model):
    __tablename__ = "buildings"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    name = db.Column(db.String(128), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    floors = db.relationship("Floor", back_populates="building", cascade="all, delete-orphan")


class Floor(TimestampMixin, db.Model):
    __tablename__ = "floors"

    id = db.Column(db.Integer, primary_key=True)
    building_id = db.Column(db.Integer, db.ForeignKey("buildings.id"), nullable=False, index=True)
    code = db.Column(db.String(32), nullable=False)
    name = db.Column(db.String(128), nullable=False)
    level = db.Column(db.Integer, nullable=False)
    width = db.Column(db.Float, nullable=False, default=0)
    height = db.Column(db.Float, nullable=False, default=0)

    building = db.relationship("Building", back_populates="floors")
    nodes = db.relationship("Node", back_populates="floor", cascade="all, delete-orphan")
    pois = db.relationship("POI", back_populates="floor", cascade="all, delete-orphan")

    __table_args__ = (db.UniqueConstraint("building_id", "code", name="uq_floor_building_code"),)


class Node(TimestampMixin, db.Model):
    __tablename__ = "nodes"

    id = db.Column(db.Integer, primary_key=True)
    external_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    floor_id = db.Column(db.Integer, db.ForeignKey("floors.id"), nullable=False, index=True)
    x = db.Column(db.Float, nullable=False)
    y = db.Column(db.Float, nullable=False)
    kind = db.Column(db.String(32), nullable=False, default="corridor")

    floor = db.relationship("Floor", back_populates="nodes")


class Edge(TimestampMixin, db.Model):
    __tablename__ = "edges"

    id = db.Column(db.Integer, primary_key=True)
    from_node_id = db.Column(db.Integer, db.ForeignKey("nodes.id"), nullable=False, index=True)
    to_node_id = db.Column(db.Integer, db.ForeignKey("nodes.id"), nullable=False, index=True)
    distance_m = db.Column(db.Float, nullable=False)
    bidirectional = db.Column(db.Boolean, nullable=False, default=True)
    is_accessible = db.Column(db.Boolean, nullable=False, default=True)


class POI(TimestampMixin, db.Model):
    __tablename__ = "pois"

    id = db.Column(db.Integer, primary_key=True)
    external_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    floor_id = db.Column(db.Integer, db.ForeignKey("floors.id"), nullable=False, index=True)
    node_id = db.Column(db.Integer, db.ForeignKey("nodes.id"), nullable=False, index=True)
    name = db.Column(db.String(128), nullable=False)
    category = db.Column(db.String(64), nullable=True)

    floor = db.relationship("Floor", back_populates="pois")
