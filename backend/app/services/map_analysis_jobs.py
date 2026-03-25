from datetime import datetime

from app.extensions import db
from app.models import UploadedMap
from app.services.map_parser import parse_map


def analyze_uploaded_map_job(map_id: int) -> dict:
    """RQ background job to parse uploaded map asynchronously."""
    from app import create_app

    app = create_app()

    with app.app_context():
        uploaded_map = UploadedMap.query.get(map_id)
        if not uploaded_map:
            return {"status": "error", "message": f"Map {map_id} not found"}

        try:
            uploaded_map.status = "analyzing"
            db.session.commit()

            analysis = parse_map(uploaded_map.file_path)

            uploaded_map.status = "analyzed"
            uploaded_map.building_count = int(analysis.get("buildingCount", 1))
            uploaded_map.floor_count = int(analysis.get("floorCount", 1))
            uploaded_map.analysis_result = {
                **analysis,
                "analyzedAt": datetime.utcnow().isoformat(),
            }
            db.session.commit()

            return {"status": "ok", "mapId": map_id, "analysis": analysis}
        except Exception as exc:
            uploaded_map.status = "error"
            uploaded_map.error_message = str(exc)
            db.session.commit()
            return {"status": "error", "mapId": map_id, "message": str(exc)}
