import json
import os
import re
from io import BytesIO
from typing import Any
from pathlib import Path

import fitz
import google.generativeai as genai
from PIL import Image
from openai import OpenAI

from app.config import Config


# Minimum distance (in canvas units) any AI-placed node must be from the canvas edge.
_NODE_INSET = 10.0


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

    # Ensure every floor has the required keys and valid node coordinates
    for bldg in buildings:
        for floor in bldg.get("floors", []):
            floor.setdefault("nodes", [])
            floor.setdefault("edges", [])
            floor.setdefault("pois", [])
            floor.setdefault("width", 1000)
            floor.setdefault("height", 800)

            # Clamp node coordinates to canvas bounds so nodes are always visible.
            canvas_w = float(floor.get("width", 1000))
            canvas_h = float(floor.get("height", 800))
            valid_node_ids: set[str] = set()
            for node in floor["nodes"]:
                node["x"] = max(_NODE_INSET, min(canvas_w - _NODE_INSET, float(node.get("x", canvas_w / 2))))
                node["y"] = max(_NODE_INSET, min(canvas_h - _NODE_INSET, float(node.get("y", canvas_h / 2))))
                if "id" in node:
                    valid_node_ids.add(str(node["id"]))

            # Drop edges that reference missing nodes to avoid broken navigation.
            floor["edges"] = [
                e for e in floor["edges"]
                if str(e.get("from", "")) in valid_node_ids and str(e.get("to", "")) in valid_node_ids
            ]
            # Drop POIs that reference missing nodes.
            floor["pois"] = [
                p for p in floor["pois"]
                if str(p.get("node", "")) in valid_node_ids
            ]

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


def _detect_panel_split_axis(file_path: str) -> tuple[str, int] | None:
    """Detect a likely split axis and cut position for multi-panel floor plans.

    Returns:
        (axis, split_index) where axis is 'vertical' or 'horizontal'.
    """
    try:
        img = Image.open(file_path).convert("L")
        w, h = img.size
        if w <= 0 or h <= 0:
            return None

        if w >= h:
            # Side-by-side plans: look for a low-ink vertical valley near center.
            sample_cols = []
            pixels = img.load()
            for x in range(w):
                c = 0
                for y in range(h):
                    if pixels[x, y] < 238:
                        c += 1
                sample_cols.append(c)

            center = w // 2
            left = max(20, int(w * 0.18))
            right = min(w - 20, int(w * 0.82))
            search = sample_cols[left:right]
            if not search:
                return None
            split_x = left + int(min(range(len(search)), key=lambda i: search[i]))

            # Require a meaningful valley between left and right content.
            left_avg = sum(sample_cols[max(0, split_x - 120):split_x - 20]) / max(1, min(100, max(0, split_x - 20) - max(0, split_x - 120)))
            right_avg = sum(sample_cols[split_x + 20:min(w, split_x + 120)]) / max(1, min(w, split_x + 120) - (split_x + 20))
            valley = sample_cols[split_x]
            edge_avg = (left_avg + right_avg) / 2.0
            if edge_avg > 0 and valley <= edge_avg * 0.52:
                return ("vertical", split_x)
        else:
            # Stacked plans: look for a low-ink horizontal valley near center.
            sample_rows = []
            pixels = img.load()
            for y in range(h):
                c = 0
                for x in range(w):
                    if pixels[x, y] < 238:
                        c += 1
                sample_rows.append(c)

            top = max(20, int(h * 0.18))
            bottom = min(h - 20, int(h * 0.82))
            search = sample_rows[top:bottom]
            if not search:
                return None
            split_y = top + int(min(range(len(search)), key=lambda i: search[i]))

            top_avg = sum(sample_rows[max(0, split_y - 120):split_y - 20]) / max(1, min(100, max(0, split_y - 20) - max(0, split_y - 120)))
            bottom_avg = sum(sample_rows[split_y + 20:min(h, split_y + 120)]) / max(1, min(h, split_y + 120) - (split_y + 20))
            valley = sample_rows[split_y]
            edge_avg = (top_avg + bottom_avg) / 2.0
            if edge_avg > 0 and valley <= edge_avg * 0.52:
                return ("horizontal", split_y)
    except Exception:
        return None

    return None


def _crop_image_bytes(file_path: str, box: tuple[int, int, int, int], mime_type: str = "image/png") -> tuple[bytes, str]:
    with Image.open(file_path) as img:
        cropped = img.crop(box)
        buffer = BytesIO()
        cropped.save(buffer, format="PNG")
        return buffer.getvalue(), mime_type


def _merge_single_floor_results(panel_results: list[dict[str, Any]]) -> dict[str, Any]:
    """Merge one-floor Gemini results into a single multi-floor result."""
    buildings = [{"name": "Building 1", "floors": []}]
    merged_graph = {"units": {"distance": "meter", "scale_m_per_unit": 0.25}, "buildings": [{"name": "Building 1", "floors": []}]}
    merged_buildings = []

    for idx, result in enumerate(panel_results, start=1):
        graph = result.get("graph") or {}
        source_buildings = graph.get("buildings") or []
        if not source_buildings:
            continue

        source_floor = (source_buildings[0].get("floors") or [{}])[0]
        floor = json.loads(json.dumps(source_floor))

        # Re-prefix IDs with the floor index to keep them unique.
        def _prefix(value: Any) -> Any:
            if not isinstance(value, str):
                return value
            if value.startswith(f"f{idx}_"):
                return value
            if value.startswith("floor"):
                return value
            return re.sub(r"^", f"f{idx}_", value)

        for node in floor.get("nodes", []):
            if "id" in node:
                node["id"] = _prefix(node["id"])
        for edge in floor.get("edges", []):
            if "from" in edge:
                edge["from"] = _prefix(edge["from"])
            if "to" in edge:
                edge["to"] = _prefix(edge["to"])
        for poi in floor.get("pois", []):
            if "id" in poi:
                poi["id"] = _prefix(poi["id"])
            if "node" in poi:
                poi["node"] = _prefix(poi["node"])

        floor["id"] = f"floor{idx}"
        floor["name"] = f"Floor {idx}"

        # If Gemini named things poorly, normalize unlabeled rooms into Room N.
        room_counter = 1
        for poi in floor.get("pois", []):
            name = str(poi.get("name", "")).strip().lower()
            if not name or name in {"room", "poi"} or name.startswith("building "):
                poi["name"] = f"Room {room_counter}"
                room_counter += 1

        merged_graph["buildings"][0]["floors"].append(floor)
        merged_buildings.append({"name": f"Building {idx}", "floors": 1})

    merged = {
        "buildingCount": 1,
        "floorCount": max(1, len(merged_graph["buildings"][0]["floors"])),
        "confidence": min([r.get("confidence", 0.8) for r in panel_results] or [0.8]),
        "buildings": [{"name": "Building 1", "floors": len(merged_graph["buildings"][0]["floors"])}],
        "graph": merged_graph,
        "notes": "Merged multi-panel parse",
        "engine": "gemini-vision-multi-panel",
        "rawTextLength": 0,
    }
    return _validate_graph(merged)


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


def _ask_gemini_vision_for_panel(file_bytes: bytes, mime_type: str, panel_index: int, panel_count: int) -> dict[str, Any]:
        if not Config.GEMINI_API_KEY:
                raise RuntimeError("GEMINI_API_KEY is not configured")

        genai.configure(api_key=Config.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        image_part = {"mime_type": mime_type, "data": file_bytes}
        prompt = f"""You are parsing panel {panel_index} of {panel_count} from a multi-floor blueprint image.

RULES:
- This panel is exactly ONE floor of the building.
- Do not combine it with any other panel.
- Do not invent room names.
- If a room has no visible label, use Room 1, Room 2, Room 3 in reading order.
- If a clear label is visible, use it exactly.
- Keep POIs and node IDs unique within this panel only.

Return strict JSON with this shape:
{{
    "buildingCount": 1,
    "floorCount": 1,
    "confidence": 0.8,
    "buildings": [{{"name": "Building 1", "floors": 1}}],
    "notes": "brief note",
    "graph": {{
        "units": {{"distance": "meter", "scale_m_per_unit": 0.25}},
        "buildings": [{{
            "name": "Building 1",
            "floors": [{{
                "id": "floor1",
                "name": "Floor 1",
                "width": 1000,
                "height": 800,
                "nodes": [...],
                "edges": [...],
                "pois": [...]
            }}]
        }}]
    }}
}}

Return ONLY valid JSON. No markdown. No extra text."""

        response = model.generate_content([image_part, prompt])
        raw = response.text.strip()
        cleaned = _clean_ai_json(raw)
        try:
                parsed = json.loads(cleaned)
        except json.JSONDecodeError as e:
                raise RuntimeError(f"AI returned invalid JSON for panel {panel_index}: {e}\nRaw output (first 500 chars): {raw[:500]}")

        return _validate_graph(parsed)

def parse_map(file_path: str, use_ai: bool = True) -> dict[str, Any]:
    """Parse a map file and infer building/floor structure.

    Uses Gemini for images if configured, OpenAI for text if configured,
    otherwise falls back to deterministic heuristics.
    """
    ext = os.path.splitext(file_path)[1].lower()

    # If fallback mode is enabled, skip AI entirely
    if Config.USE_FALLBACK_PARSING:
        use_ai = False

    if use_ai and ext in {".png", ".jpg", ".jpeg"} and Config.GEMINI_API_KEY:
        try:
            detected_panels = _estimate_floor_panels_from_image(file_path)

            # Stronger path for multi-panel floor plans: parse each detected panel separately.
            if detected_panels > 1:
                axis_split = _detect_panel_split_axis(file_path)
                if axis_split:
                    axis, split_index = axis_split
                    with Image.open(file_path) as img:
                        w, h = img.size
                    panel_results: list[dict[str, Any]] = []
                    if axis == "vertical":
                        with Image.open(file_path) as img:
                            left_bytes, mime_type = _crop_image_bytes(file_path, (0, 0, split_index, h))
                            right_bytes, _ = _crop_image_bytes(file_path, (split_index, 0, w, h), mime_type)
                        panel_results.append(_ask_gemini_vision_for_panel(left_bytes, mime_type, 1, 2))
                        panel_results.append(_ask_gemini_vision_for_panel(right_bytes, mime_type, 2, 2))
                    else:
                        with Image.open(file_path) as img:
                            top_bytes, mime_type = _crop_image_bytes(file_path, (0, 0, w, split_index))
                            bottom_bytes, _ = _crop_image_bytes(file_path, (0, split_index, w, h), mime_type)
                        panel_results.append(_ask_gemini_vision_for_panel(top_bytes, mime_type, 1, 2))
                        panel_results.append(_ask_gemini_vision_for_panel(bottom_bytes, mime_type, 2, 2))

                    result = _merge_single_floor_results(panel_results)
                    result["notes"] = f"Multi-panel parse using Gemini panel split ({axis})"
                else:
                    result = _ask_gemini_vision_for_structure(file_path)
                    if detected_panels > int(result.get("floorCount", 1)):
                        result = _expand_floor_graph_if_needed(result, detected_panels)
                        result["floorCount"] = detected_panels
                        existing_notes = (result.get("notes") or "").strip()
                        note = f"Visual panel detector identified {detected_panels} floor plan panels"
                        result["notes"] = f"{existing_notes} | {note}" if existing_notes else note
            else:
                result = _ask_gemini_vision_for_structure(file_path)
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
            # If Gemini fails (quota, error, etc), fall back to deterministic parser
            error_msg = str(exc).lower()
            if "429" in error_msg or "quota" in error_msg or Config.USE_FALLBACK_PARSING:
                # Silently fall through to heuristic parser
                pass
            else:
                # For other errors, also fall back but note them
                pass

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
        "notes": "Heuristic parser used (fallback mode enabled or no AI configured)",
        "engine": "heuristic",
        "rawTextLength": len(text),
    }
