import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.training_pipeline import get_training_overview


if __name__ == "__main__":
    overview = get_training_overview()
    maps = overview.get("maps", [])
    model = overview.get("model", {})

    print(f"Training maps cataloged: {len(maps)}")
    print(f"Model version: {model.get('version', 'n/a')}")
    print(f"Samples used: {model.get('sampleCount', 0)}")
    print(f"Average buildings: {model.get('avgBuildingCount', 1)}")
    print(f"Average floors: {model.get('avgFloorCount', 1)}")
