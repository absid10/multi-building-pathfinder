import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.training_pipeline import train_layout_model


if __name__ == "__main__":
    model = train_layout_model()
    print("Layout model retrained")
    print(f"Version: {model.get('version')}")
    print(f"Trained at: {model.get('trainedAt')}")
    print(f"Samples: {model.get('sampleCount')}")
    print(f"Avg buildings: {model.get('avgBuildingCount')}")
    print(f"Avg floors: {model.get('avgFloorCount')}")
