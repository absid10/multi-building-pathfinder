import json
import os
import re
from typing import Any
from pathlib import Path

import fitz
import google.generativeai as genai
from PIL import Image
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

def _clean_ai_json(raw: str) -> str:
    """Strip markdown fences, trailing commas, and other common AI JSON issues."""
    text = raw.strip()
    # Remove markdown code fences
    if text.startswith("```"):
        first_nl = text.find("\n")
        if first_nl > 0:
            text = text[first_nl + 1:]
        text = text.rstrip("`").strip()
    # Remove trailing commas before } or ]
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return text


def _validate_graph(parsed: dict[str, Any]) -> dict[str, Any]:
    """Ensure the parsed graph has the required structure. Fill defaults if needed."""
    graph = parsed.get("graph", {})
    buildings = graph.get("buildings", [])

    if not buildings:
        # Create a minimal scaffold so the frontend can still render
        parsed.setdefault("buildingCount", 1)
        parsed.setdefault("floorCount", 1)
        parsed["graph"] = {
            "units": {"distance": "meter", "scale_m_per_unit": 0.25},
            "buildings": [{
                "name": "Building 1",
                "floors": [{
                    "id": "floor1",
                    "name": "Floor 1",
                    "width": 1000,
                    "height": 800,
                    "nodes": [],
                    "edges": [],
                    "pois": [],
                }]
            }]
        }
        parsed["buildings"] = [{"name": "Building 1", "floors": 1}]
        return parsed

    # Ensure every floor has the required keys
    for bldg in buildings:
        for floor in bldg.get("floors", []):
            floor.setdefault("nodes", [])
            floor.setdefault("edges", [])
            floor.setdefault("pois", [])
            floor.setdefault("width", 1000)
            floor.setdefault("height", 800)

    # Re-count from actual graph data
    total_floors = sum(len(b.get("floors", [])) for b in buildings)
    parsed["buildingCount"] = max(1, len(buildings))
    parsed["floorCount"] = max(1, total_floors)

    return parsed


def _estimate_floor_panels_from_image(file_path: str) -> int:
    """Estimate number of floor drawings visible in one image.

    Many blueprints place Floor 1 and Floor 2 side-by-side. This detector
    counts major vertical drawing bands to prevent undercounting floors.
    """
    try:
        img = Image.open(file_path).convert("L")  # grayscale
        w, h = img.size
        # Downscale for stability/speed while preserving layout bands.
        if w > 1400:
            ratio = 1400 / float(w)
            img = img.resize((1400, max(1, int(h * ratio))))
            w, h = img.size

        pixels = img.load()
        # Count "ink" pixels per x-column (non-white content).
        ink_counts = []
        for x in range(w):
            c = 0
            for y in range(h):
                if pixels[x, y] < 238:
                    c += 1
            ink_counts.append(c)

        # Smooth with a moving average to remove watermark/noise spikes.
        window = max(5, w // 120)
        smoothed = []
        running = 0
        for i, val in enumerate(ink_counts):
            running += val
            if i >= window:
                running -= ink_counts[i - window]
            smoothed.append(running / float(min(i + 1, window)))

        # Dynamic threshold based on content density.
        mx = max(smoothed) if smoothed else 0
        if mx <= 0:
            return 1
        threshold = max(6.0, mx * 0.22)

        bands: list[tuple[int, int]] = []
        in_band = False
        start = 0
        for i, v in enumerate(smoothed):
            if v >= threshold and not in_band:
                in_band = True
                start = i
            elif v < threshold and in_band:
                in_band = False
                bands.append((start, i - 1))
        if in_band:
            bands.append((start, w - 1))

        # Keep only substantial bands (floor drawings), ignore tiny artifacts.
        min_band_width = max(70, w // 10)
        major_bands = [b for b in bands if (b[1] - b[0] + 1) >= min_band_width]

        return max(1, min(5, len(major_bands)))
    except Exception:
        return 1


def _expand_floor_graph_if_needed(parsed: dict[str, Any], target_floor_count: int) -> dict[str, Any]:
    """If graph has fewer floors than detected panels, clone floor scaffold to match."""
    graph = parsed.get("graph") or {}
    buildings = graph.get("buildings") or []
    if not buildings:
        return parsed

    b0 = buildings[0]
    floors = list(b0.get("floors") or [])
    if not floors:
        return parsed
    if len(floors) >= target_floor_count:
        return parsed

    template = floors[0]
    for next_floor in range(len(floors) + 1, target_floor_count + 1):
        src_floor_no = 1
        dst_floor_no = next_floor

        src_nodes = template.get("nodes", [])
        src_edges = template.get("edges", [])
        src_pois = template.get("pois", [])

        def _rid(value: str) -> str:
            if not isinstance(value, str):
                return value
            return re.sub(rf"\bf{src_floor_no}_", f"f{dst_floor_no}_", value)

        new_nodes = []
        for n in src_nodes:
            nn = dict(n)
            if "id" in nn:
                nn["id"] = _rid(nn["id"])
            new_nodes.append(nn)

        new_edges = []
        for e in src_edges:
            ne = dict(e)
            if "from" in ne:
                ne["from"] = _rid(ne["from"])
            if "to" in ne:
                ne["to"] = _rid(ne["to"])
            new_edges.append(ne)

        room_counter = 1
        new_pois = []
        for p in src_pois:
            np = dict(p)
            if "id" in np:
                np["id"] = _rid(np["id"])
            if "node" in np:
                np["node"] = _rid(np["node"])
            # Default sequential naming for duplicated unlabeled-style plans.
            icon = str(np.get("icon", "")).lower()
            if "stair" in icon:
                np["name"] = f"Stairs {room_counter}"
            else:
                np["name"] = f"Room {room_counter}"
            room_counter += 1
            new_pois.append(np)

        new_floor = {
            "id": f"floor{dst_floor_no}",
            "name": f"Floor {dst_floor_no}",
            "width": template.get("width", 1000),
            "height": template.get("height", 800),
            "nodes": new_nodes,
            "edges": new_edges,
            "pois": new_pois,
        }
        floors.append(new_floor)

    b0["floors"] = floors
    parsed["graph"] = graph
    parsed["buildingCount"] = max(1, len(buildings))
    parsed["floorCount"] = max(parsed.get("floorCount", 1), len(floors), target_floor_count)

    if parsed.get("buildings") and isinstance(parsed["buildings"], list):
        parsed["buildings"][0]["floors"] = parsed["floorCount"]

    return parsed


def _ask_gemini_vision_for_structure(file_path: str) -> dict[str, Any]:
    if not Config.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    genai.configure(api_key=Config.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")

    # Read file bytes directly for inline upload (more reliable on Render)
    import mimetypes
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type:
        mime_type = "image/png"

    with open(file_path, "rb") as f:
        image_bytes = f.read()

    image_part = {"mime_type": mime_type, "data": image_bytes}

    prompt = """You are an expert architectural floor plan analyzer. Study the uploaded blueprint image carefully.

YOUR TASK: Extract a complete indoor navigation graph from this floor plan image.

STEP 1 — OBSERVE THE IMAGE:
- Count how many SEPARATE floor plan drawings are shown. If you see two plans side-by-side, that means 2 floors. If you see one plan, that means 1 floor.
- Each separate plan drawing = one floor of the SAME building (Building 1).
- Look for rooms (enclosed rectangular areas), hallways/corridors (connecting spaces), doors (openings in walls), and staircases (hatched rectangles or staircase symbols).

STEP 2 — NAME THE ROOMS:
- If a room has a CLEAR TEXT LABEL written on it (like "Kitchen", "Office 101"), use that exact label.
- If a room has NO text label or only an AREA measurement (like "A:10.34 m2" or "14.03 m²"), name it sequentially: "Room 1", "Room 2", "Room 3", etc. Number them left-to-right, top-to-bottom for each floor.
- NEVER invent names like "Admission", "Lab", "Classroom" unless those words are literally printed on the blueprint.
- Label staircases as "Stairs 1", "Stairs 2".
- Label the main entrance as "Entrance".

STEP 3 — BUILD THE NAVIGATION GRAPH:
- Place corridor nodes along hallways and at junctions/intersections. Use coordinates scaled to a 1000x800 canvas.
- For each room, place a POI node at the room's approximate center position.
- Connect corridor nodes with edges along the hallways.
- Connect each room's POI to the nearest corridor node via an edge (representing the doorway).
- Connect staircase nodes to adjacent corridor nodes.
- Estimate distance_m between connected nodes based on visual proportions.

STEP 4 — RETURN STRICT JSON (no markdown, no explanation, no code fences):

{
  "buildingCount": 1,
  "floorCount": <number_of_floor_plans_visible>,
  "confidence": 0.8,
  "buildings": [{"name": "Building 1", "floors": <number_of_floor_plans_visible>}],
  "notes": "<brief description>",
  "graph": {
    "units": {"distance": "meter", "scale_m_per_unit": 0.25},
    "buildings": [
      {
        "name": "Building 1",
        "floors": [
          {
            "id": "floor1",
            "name": "Floor 1",
            "width": 1000,
            "height": 800,
            "nodes": [
              {"id": "f1_c1", "x": 200, "y": 400, "kind": "corridor"},
              {"id": "f1_c2", "x": 500, "y": 400, "kind": "corridor"},
              {"id": "f1_room1", "x": 150, "y": 200, "kind": "poi"},
              {"id": "f1_stairs1", "x": 800, "y": 600, "kind": "stairs"}
            ],
            "edges": [
              {"from": "f1_c1", "to": "f1_c2", "distance_m": 7.5, "bidirectional": true},
              {"from": "f1_c1", "to": "f1_room1", "distance_m": 3.0, "bidirectional": true},
              {"from": "f1_c2", "to": "f1_stairs1", "distance_m": 5.0, "bidirectional": true}
            ],
            "pois": [
              {"id": "poi_f1_room1", "name": "Room 1", "node": "f1_room1", "icon": "door-open"},
              {"id": "poi_f1_stairs1", "name": "Stairs 1", "node": "f1_stairs1", "icon": "stairs"}
            ]
          }
        ]
      }
    ]
  }
}

CRITICAL RULES:
- Return ONLY valid JSON. No markdown. No code blocks. No explanation text.
- Each floor must have at least 3 corridor nodes and at least 2 POIs.
- Node IDs must be unique across the entire graph (prefix with floor like "f1_", "f2_").
- Every POI must reference a valid node ID in its "node" field.
- Every edge must reference valid node IDs in "from" and "to" fields.
- x ranges from 0 to 1000, y ranges from 0 to 800.
"""

    response = model.generate_content([image_part, prompt])
    raw = response.text.strip()
    cleaned = _clean_ai_json(raw)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"AI returned invalid JSON: {e}\nRaw output (first 500 chars): {raw[:500]}")

    validated = _validate_graph(parsed)
    return validated

def parse_map(file_path: str, use_ai: bool = True) -> dict[str, Any]:
    """Parse a map file and infer building/floor structure.

    Uses Gemini for images if configured, OpenAI for text if configured,
    otherwise falls back to deterministic heuristics.
    """
    ext = os.path.splitext(file_path)[1].lower()

    if use_ai and ext in {".png", ".jpg", ".jpeg"} and Config.GEMINI_API_KEY:
        try:
            result = _ask_gemini_vision_for_structure(file_path)
            detected_panels = _estimate_floor_panels_from_image(file_path)
            if detected_panels > int(result.get("floorCount", 1)):
                result = _expand_floor_graph_if_needed(result, detected_panels)
                result["floorCount"] = detected_panels
                existing_notes = (result.get("notes") or "").strip()
                note = f"Visual panel detector identified {detected_panels} floor plan panels"
                result["notes"] = f"{existing_notes} | {note}" if existing_notes else note

            return {
                "buildingCount": result.get("buildingCount", 1),
                "floorCount": result.get("floorCount", 1),
                "confidence": result.get("confidence", 0.8),
                "buildings": result.get("buildings", []),
                "graph": result.get("graph", {}),
                "notes": result.get("notes", "Parsed via Gemini API"),
                "engine": "gemini-vision",
                "rawTextLength": 0,
            }
        except Exception as exc:
            raise RuntimeError(f"Gemini Vision failed: {str(exc)}") from exc

    if ext == ".pdf":
        text = _extract_pdf_text(file_path)
    elif ext in {".svg", ".js"}:
        try:
            raw = Path(file_path).read_text(encoding="utf-8", errors="ignore")
            text = f"Map source file: {os.path.basename(file_path)}\n{raw[:12000]}"
        except Exception:
            text = f"Map source file: {os.path.basename(file_path)}"
    else:
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
        "notes": "Heuristic parser used because APIs are not set",
        "engine": "heuristic",
        "rawTextLength": len(text),
    }
