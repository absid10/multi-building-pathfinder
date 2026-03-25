import json
import os
import re
from typing import Any

import fitz
from openai import OpenAI

from app.config import Config


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


def parse_map(file_path: str) -> dict[str, Any]:
    """Parse a map file and infer building/floor structure.

    Uses OpenAI if configured, otherwise falls back to deterministic text heuristics.
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        text = _extract_pdf_text(file_path)
    else:
        # For images, OCR can be added here. For now we parse metadata-ish fallback text.
        text = f"Image map file: {os.path.basename(file_path)}"

    if Config.OPENAI_API_KEY:
        try:
            ai_result = _ask_openai_for_structure(text)
            return {
                "buildingCount": ai_result["buildingCount"],
                "floorCount": ai_result["floorCount"],
                "confidence": ai_result["confidence"],
                "buildings": ai_result.get("buildings", []),
                "notes": ai_result.get("notes", ""),
                "engine": "openai",
                "rawTextLength": len(text),
            }
        except Exception as exc:
            # Fall through to deterministic parser if AI call fails.
            fallback_buildings, fallback_floors = _estimate_counts_from_text(text)
            return {
                "buildingCount": fallback_buildings,
                "floorCount": fallback_floors,
                "confidence": 0.45,
                "buildings": [
                    {"name": f"Building {chr(65 + i)}", "floors": fallback_floors}
                    for i in range(fallback_buildings)
                ],
                "notes": f"OpenAI parsing failed, fallback used: {exc}",
                "engine": "fallback-after-ai-error",
                "rawTextLength": len(text),
            }

    building_count, floor_count = _estimate_counts_from_text(text)
    return {
        "buildingCount": building_count,
        "floorCount": floor_count,
        "confidence": 0.4,
        "buildings": [
            {"name": f"Building {chr(65 + i)}", "floors": floor_count}
            for i in range(building_count)
        ],
        "notes": "Heuristic parser used because OPENAI_API_KEY is not set",
        "engine": "heuristic",
        "rawTextLength": len(text),
    }
