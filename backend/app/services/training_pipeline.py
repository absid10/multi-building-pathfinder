import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from app.services.map_parser import parse_map

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".pdf"}


def _project_root() -> Path:
    # backend/app/services -> backend -> project root
    return Path(__file__).resolve().parents[3]


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _training_dir() -> Path:
    p = _backend_root() / "data" / "training"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _catalog_path() -> Path:
    return _training_dir() / "catalog.json"


def _model_path() -> Path:
    return _training_dir() / "layout_model.json"


def _iso_now() -> str:
    return datetime.utcnow().isoformat()


def _normalize_entry(path: Path, source: str) -> dict[str, Any]:
    ext = path.suffix.lower()
    return {
        "id": f"{source}:{path.name}",
        "name": path.name,
        "source": source,
        "fileType": ext.lstrip("."),
        "relativePath": str(path.relative_to(_project_root())).replace("\\", "/"),
        "addedAt": _iso_now(),
    }


def _load_catalog() -> list[dict[str, Any]]:
    catalog_file = _catalog_path()
    if not catalog_file.exists():
        return []
    try:
        return json.loads(catalog_file.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_catalog(entries: list[dict[str, Any]]) -> None:
    _catalog_path().write_text(json.dumps(entries, indent=2), encoding="utf-8")


def _find_sample_files() -> list[tuple[Path, str]]:
    candidates: list[tuple[Path, str]] = []
    refs_dir = _project_root() / "references for frontend"
    uploads_dir = _backend_root() / "uploads"

    for base_dir, source in ((refs_dir, "reference"), (uploads_dir, "upload")):
        if not base_dir.exists():
            continue
        for item in base_dir.iterdir():
            if not item.is_file():
                continue
            if item.suffix.lower() in SUPPORTED_EXTENSIONS:
                candidates.append((item, source))

    return candidates


def refresh_training_catalog() -> list[dict[str, Any]]:
    existing = {entry.get("relativePath"): entry for entry in _load_catalog()}
    merged: dict[str, dict[str, Any]] = dict(existing)

    for path, source in _find_sample_files():
        rel = str(path.relative_to(_project_root())).replace("\\", "/")
        if rel not in merged:
            merged[rel] = _normalize_entry(path, source)

    entries = sorted(merged.values(), key=lambda x: x.get("name", "").lower())
    _save_catalog(entries)
    return entries


def add_uploaded_map_to_training(file_path: str) -> None:
    p = Path(file_path).resolve()
    if not p.exists() or p.suffix.lower() not in SUPPORTED_EXTENSIONS:
        return

    entries = _load_catalog()
    rel = str(p.relative_to(_project_root())).replace("\\", "/")
    if any(entry.get("relativePath") == rel for entry in entries):
        return

    entries.append(_normalize_entry(p, "upload"))
    entries.sort(key=lambda x: x.get("name", "").lower())
    _save_catalog(entries)


def _load_model() -> dict[str, Any]:
    p = _model_path()
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def train_layout_model() -> dict[str, Any]:
    catalog = refresh_training_catalog()
    parsed_samples: list[dict[str, Any]] = []

    for entry in catalog:
        rel = entry.get("relativePath", "")
        abs_path = _project_root() / rel
        if not abs_path.exists():
            continue
        try:
            parsed = parse_map(str(abs_path), use_ai=False)
            parsed_samples.append(parsed)
        except Exception:
            continue

    if not parsed_samples:
        model = {
            "version": "1.0",
            "trainedAt": _iso_now(),
            "sampleCount": 0,
            "avgBuildingCount": 1,
            "avgFloorCount": 1,
            "keywordPriors": {},
        }
        _model_path().write_text(json.dumps(model, indent=2), encoding="utf-8")
        return model

    avg_buildings = round(sum(int(s.get("buildingCount", 1)) for s in parsed_samples) / len(parsed_samples), 2)
    avg_floors = round(sum(int(s.get("floorCount", 1)) for s in parsed_samples) / len(parsed_samples), 2)

    keyword_priors = {
        "admin": {"buildingCount": 1, "floorCount": max(2, int(round(avg_floors)))},
        "academic": {"buildingCount": max(1, int(round(avg_buildings))), "floorCount": max(2, int(round(avg_floors)))},
        "hospital": {"buildingCount": max(2, int(round(avg_buildings))), "floorCount": max(2, int(round(avg_floors)))},
        "college": {"buildingCount": max(2, int(round(avg_buildings))), "floorCount": max(2, int(round(avg_floors)))},
    }

    model = {
        "version": "1.0",
        "trainedAt": _iso_now(),
        "sampleCount": len(parsed_samples),
        "avgBuildingCount": avg_buildings,
        "avgFloorCount": avg_floors,
        "keywordPriors": keyword_priors,
    }
    _model_path().write_text(json.dumps(model, indent=2), encoding="utf-8")
    return model


def get_training_overview() -> dict[str, Any]:
    catalog = refresh_training_catalog()
    model = _load_model()
    if not model:
        model = train_layout_model()

    return {
        "maps": catalog,
        "model": model,
    }
