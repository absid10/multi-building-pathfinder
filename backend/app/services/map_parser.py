import json
import os
import re
from typing import Any
from pathlib import Path

import fitz
from openai import OpenAI

from app.config import Config


def _load_layout_model() -> dict[str, Any]:
    model_path = Path(__file__).resolve().parents[2] / "data" / "training" / "layout_model.json"
    if not model_path.exists():
        return {}
    try:
        return json.loads(model_path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _apply_layout_priors(text: str, building_count: int, floor_count: int) -> tuple[int, int]:
    model = _load_layout_model()
    priors = model.get("keywordPriors", {}) if isinstance(model, dict) else {}
    if not priors:
        return building_count, floor_count

    lowered = (text or "").lower()
    for keyword, prior in priors.items():
        if keyword in lowered:
            b = int(prior.get("buildingCount", building_count))
            f = int(prior.get("floorCount", floor_count))
            return max(1, b), max(1, f)

    avg_buildings = model.get("avgBuildingCount")
    avg_floors = model.get("avgFloorCount")
    if isinstance(avg_buildings, (int, float)) and isinstance(avg_floors, (int, float)):
        return max(1, int(round(avg_buildings))), max(1, int(round(avg_floors)))

    return building_count, floor_count


def _estimate_scale_m_per_unit(text: str) -> float:
    """Estimate meters-per-unit from textual scale hints like 1:100.

    Falls back to a conservative indoor default.
    """
    if not text:
        return 0.25

    scale_match = re.search(r"\b1\s*:\s*(\d{2,4})\b", text)
    if not scale_match:
        return 0.25

    ratio = int(scale_match.group(1))
    # Very rough heuristic conversion for map units used by the frontend graph.
    if ratio <= 75:
        return 0.18
    if ratio <= 125:
        return 0.25
    if ratio <= 200:
        return 0.35
    return 0.45


def _build_floor_graph(
    building_label: str,
    floor_number: int,
    scale_m_per_unit: float,
) -> dict[str, Any]:
    """Create a navigable floor graph with nodes, edges, POIs and distances."""
    y = 140 + (floor_number - 1) * 12
    corridor_nodes = [
        {"id": f"{building_label}_f{floor_number}_n{i}", "x": 80 + i * 120, "y": y}
        for i in range(7)
    ]

    stair_left = {
        "id": f"{building_label}_f{floor_number}_stairs_l",
        "x": 320,
        "y": y - 70,
        "kind": "stairs",
    }
    stair_right = {
        "id": f"{building_label}_f{floor_number}_stairs_r",
        "x": 560,
        "y": y + 70,
        "kind": "stairs",
    }

    poi_nodes = [
        {"id": f"{building_label}_f{floor_number}_poi_admin", "x": 200, "y": y - 65, "kind": "poi"},
        {"id": f"{building_label}_f{floor_number}_poi_lab", "x": 440, "y": y - 75, "kind": "poi"},
        {"id": f"{building_label}_f{floor_number}_poi_class", "x": 680, "y": y - 55, "kind": "poi"},
        {"id": f"{building_label}_f{floor_number}_poi_service", "x": 680, "y": y + 85, "kind": "poi"},
    ]

    nodes = corridor_nodes + [stair_left, stair_right] + poi_nodes

    def _distance(a: dict[str, Any], b: dict[str, Any]) -> float:
        dx = float(a["x"]) - float(b["x"])
        dy = float(a["y"]) - float(b["y"])
        units = (dx * dx + dy * dy) ** 0.5
        return round(units * scale_m_per_unit, 2)

    edges: list[dict[str, Any]] = []
    for idx in range(len(corridor_nodes) - 1):
        a = corridor_nodes[idx]
        b = corridor_nodes[idx + 1]
        edges.append({"from": a["id"], "to": b["id"], "distance_m": _distance(a, b), "bidirectional": True})

    # Stair connectors
    edges.append({
        "from": corridor_nodes[2]["id"],
        "to": stair_left["id"],
        "distance_m": _distance(corridor_nodes[2], stair_left),
        "bidirectional": True,
    })
    edges.append({
        "from": corridor_nodes[4]["id"],
        "to": stair_right["id"],
        "distance_m": _distance(corridor_nodes[4], stair_right),
        "bidirectional": True,
    })

    # POI connectors
    poi_attach = [1, 3, 5, 5]
    for poi, junction_index in zip(poi_nodes, poi_attach):
        j = corridor_nodes[junction_index]
        edges.append({
            "from": j["id"],
            "to": poi["id"],
            "distance_m": _distance(j, poi),
            "bidirectional": True,
        })

    pois = [
        {"id": f"{building_label}_f{floor_number}_admission", "name": f"{building_label} Admission", "node": poi_nodes[0]["id"], "icon": "archive"},
        {"id": f"{building_label}_f{floor_number}_lab", "name": f"{building_label} Lab", "node": poi_nodes[1]["id"], "icon": "droplet"},
        {"id": f"{building_label}_f{floor_number}_classroom", "name": f"{building_label} Classroom", "node": poi_nodes[2]["id"], "icon": "info"},
        {"id": f"{building_label}_f{floor_number}_service", "name": f"{building_label} Service Desk", "node": poi_nodes[3]["id"], "icon": "door-open"},
    ]

    return {
        "id": f"floor{floor_number}",
        "name": f"Floor {floor_number}",
        "width": 920,
        "height": 360,
        "nodes": nodes,
        "edges": edges,
        "pois": pois,
    }


def _build_navigable_graph(building_count: int, floor_count: int, text: str) -> dict[str, Any]:
    scale = _estimate_scale_m_per_unit(text)
    buildings = []

    for i in range(building_count):
        b_name = f"Building {chr(65 + i)}"
        floors = [_build_floor_graph(b_name.replace(" ", "_"), f, scale) for f in range(1, floor_count + 1)]
        buildings.append({"name": b_name, "floors": floors})

    return {
        "units": {"distance": "meter", "scale_m_per_unit": scale},
        "buildings": buildings,
    }


def _extract_pdf_text(file_path: str, max_pages: int = 5) -> str:
    doc = fitz.open(file_path)
    try:
        chunks = []
        for i in range(min(max_pages, len(doc))):
            chunks.append(doc[i].get_text("text"))
        return "\n".join(chunks)
    finally:
        doc.close()


def _estimate_counts_from_text(text: str) -> tuple[int, int]:
    lowered = text.lower()
    floor_markers = re.findall(r"\b(floor|level|basement|ground)\b", lowered)
    building_markers = re.findall(r"\b(building|block|tower|wing)\b", lowered)

    floor_count = max(1, min(20, len(floor_markers)))
    building_count = max(1, min(10, len(building_markers)))

    # If text likely includes detailed floor plans, nudge floors upward.
    if len(text) > 1000 and floor_count <= 2:
        floor_count = 3

    return building_count, floor_count


def _ask_openai_for_structure(extracted_text: str) -> dict[str, Any]:
    if not Config.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    client = OpenAI(api_key=Config.OPENAI_API_KEY)

    prompt = (
        "You are an architectural map parser. "
        "Given this extracted map text, infer structure and return strict JSON with keys: "
        "buildingCount (int), floorCount (int), confidence (float 0-1), "
        "buildings (array of {name:string,floors:int}), notes (string). "
        "Do not include markdown or explanations.\n\n"
        f"TEXT:\n{extracted_text[:12000]}"
    )

    response = client.responses.create(
        model=Config.OPENAI_MODEL,
        input=prompt,
        temperature=0.1,
    )

    raw = response.output_text.strip()
    parsed = json.loads(raw)

    parsed["buildingCount"] = int(max(1, parsed.get("buildingCount", 1)))
    parsed["floorCount"] = int(max(1, parsed.get("floorCount", 1)))
    parsed["confidence"] = float(min(1.0, max(0.0, parsed.get("confidence", 0.6))))

    return parsed


def parse_map(file_path: str, use_ai: bool = True) -> dict[str, Any]:
    """Parse a map file and infer building/floor structure.

    Uses OpenAI if configured, otherwise falls back to deterministic text heuristics.
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        text = _extract_pdf_text(file_path)
    elif ext in {".svg", ".js"}:
        try:
            raw = Path(file_path).read_text(encoding="utf-8", errors="ignore")
            text = f"Map source file: {os.path.basename(file_path)}\n{raw[:12000]}"
        except Exception:
            text = f"Map source file: {os.path.basename(file_path)}"
    else:
        # For images, OCR can be added here. For now we parse metadata-ish fallback text.
        text = f"Image map file: {os.path.basename(file_path)}"

    if Config.OPENAI_API_KEY and use_ai:
        try:
            ai_result = _ask_openai_for_structure(text)
            graph = _build_navigable_graph(
                ai_result["buildingCount"],
                ai_result["floorCount"],
                text,
            )
            return {
                "buildingCount": ai_result["buildingCount"],
                "floorCount": ai_result["floorCount"],
                "confidence": ai_result["confidence"],
                "buildings": ai_result.get("buildings", []),
                "graph": graph,
                "notes": ai_result.get("notes", ""),
                "engine": "openai",
                "rawTextLength": len(text),
            }
        except Exception as exc:
            # Fall through to deterministic parser if AI call fails.
            fallback_buildings, fallback_floors = _estimate_counts_from_text(text)
            graph = _build_navigable_graph(fallback_buildings, fallback_floors, text)
            return {
                "buildingCount": fallback_buildings,
                "floorCount": fallback_floors,
                "confidence": 0.45,
                "buildings": [
                    {"name": f"Building {chr(65 + i)}", "floors": fallback_floors}
                    for i in range(fallback_buildings)
                ],
                "graph": graph,
                "notes": f"OpenAI parsing failed, fallback used: {exc}",
                "engine": "fallback-after-ai-error",
                "rawTextLength": len(text),
            }

    building_count, floor_count = _estimate_counts_from_text(text)
    building_count, floor_count = _apply_layout_priors(text, building_count, floor_count)
    graph = _build_navigable_graph(building_count, floor_count, text)
    return {
        "buildingCount": building_count,
        "floorCount": floor_count,
        "confidence": 0.4,
        "buildings": [
            {"name": f"Building {chr(65 + i)}", "floors": floor_count}
            for i in range(building_count)
        ],
        "graph": graph,
        "notes": "Heuristic parser used because OPENAI_API_KEY is not set",
        "engine": "heuristic",
        "rawTextLength": len(text),
    }
