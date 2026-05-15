import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from app.models import Building, Edge, Floor, Node, POI


BACKEND_DIR = Path(__file__).resolve().parents[1]
SEED_FILE = BACKEND_DIR / "data" / "seed" / "map_registry.seed.json"


def _as_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _as_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def _safe_str(value, fallback=""):
    return str(value).strip() if value is not None else fallback


def _category_from_icon(icon: str) -> str:
    value = (icon or "").strip().lower()
    if not value:
        return "info"
    return value


def _db_node_external_id(building_code: str, floor_code: str, raw_id: str) -> str:
    return f"{building_code}::{floor_code}::{raw_id}"


def _db_poi_external_id(building_code: str, floor_code: str, raw_id: str) -> str:
    return f"{building_code}::{floor_code}::{raw_id}"


def _upsert_building(map_id: str, building_payload: dict):
    building_key = _safe_str(building_payload.get("key"))
    code = f"{map_id}__{building_key}"
    name = _safe_str(building_payload.get("name"), building_key or "Building")

    existing = Building.query.filter_by(code=code).first()
    if existing:
        db.session.delete(existing)
        db.session.flush()

    building = Building(code=code, name=name)
    db.session.add(building)
    db.session.flush()

    floor_count = 0
    node_count = 0
    edge_count = 0
    poi_count = 0

    for floor_payload in building_payload.get("floors", []):
        floor_code = _safe_str(floor_payload.get("code"), "floor1")
        floor = Floor(
            building_id=building.id,
            code=floor_code,
            name=_safe_str(floor_payload.get("name"), floor_code),
            level=_as_int(floor_payload.get("level"), 1),
            width=_as_float(floor_payload.get("width"), 0),
            height=_as_float(floor_payload.get("height"), 0),
        )
        db.session.add(floor)
        db.session.flush()
        floor_count += 1

        node_id_by_raw_external: dict[str, int] = {}

        for node_payload in floor_payload.get("nodes", []):
            raw_external_id = _safe_str(node_payload.get("id"))
            if not raw_external_id:
                continue

            node = Node(
                external_id=_db_node_external_id(code, floor_code, raw_external_id),
                floor_id=floor.id,
                x=_as_float(node_payload.get("x"), 0),
                y=_as_float(node_payload.get("y"), 0),
                kind=_safe_str(node_payload.get("kind"), "corridor"),
            )
            db.session.add(node)
            db.session.flush()
            node_id_by_raw_external[raw_external_id] = node.id
            node_count += 1

        for edge_payload in floor_payload.get("edges", []):
            from_raw_external = _safe_str(edge_payload.get("from"))
            to_raw_external = _safe_str(edge_payload.get("to"))
            from_id = node_id_by_raw_external.get(from_raw_external)
            to_id = node_id_by_raw_external.get(to_raw_external)
            if not from_id or not to_id:
                continue

            weight = edge_payload.get("weight", edge_payload.get("distance_m", 1))
            edge = Edge(
                from_node_id=from_id,
                to_node_id=to_id,
                distance_m=_as_float(weight, 1),
                bidirectional=True,
                is_accessible=True,
            )
            db.session.add(edge)
            edge_count += 1

        for poi_payload in floor_payload.get("pois", []):
            poi_raw_external_id = _safe_str(poi_payload.get("id"))
            node_raw_external_id = _safe_str(poi_payload.get("node"))
            node_id = node_id_by_raw_external.get(node_raw_external_id)
            if not poi_raw_external_id or not node_id:
                continue

            poi = POI(
                external_id=_db_poi_external_id(code, floor_code, poi_raw_external_id),
                floor_id=floor.id,
                node_id=node_id,
                name=_safe_str(poi_payload.get("name"), poi_raw_external_id),
                category=_category_from_icon(_safe_str(poi_payload.get("icon"), "info")),
            )
            db.session.add(poi)
            poi_count += 1

    return {
        "code": code,
        "name": name,
        "floors": floor_count,
        "nodes": node_count,
        "edges": edge_count,
        "pois": poi_count,
    }


def main():
    if not SEED_FILE.exists():
        raise SystemExit(f"Seed file not found: {SEED_FILE}")

    with open(SEED_FILE, "r", encoding="utf-8") as f:
        payload = json.load(f)

    app = create_app()
    with app.app_context():
        summary = []
        for map_payload in payload.get("maps", []):
            map_id = _safe_str(map_payload.get("mapId"))
            if not map_id:
                continue

            for building_payload in map_payload.get("buildings", []):
                summary.append(_upsert_building(map_id, building_payload))

        db.session.commit()

    print("Map seed import completed.")
    for item in summary:
        print(
            f"- {item['code']}: floors={item['floors']}, nodes={item['nodes']}, "
            f"edges={item['edges']}, pois={item['pois']}"
        )


if __name__ == "__main__":
    main()
