# Training Data Folder

This folder stores the local training catalog and lightweight layout model used by map parsing.

## Files
- `catalog.json`: Map files used as training samples.
- `layout_model.json`: Trained priors (average building/floor counts + keyword priors).

## Add More Layouts (including web-sourced plans)
1. Save map files (`.png`, `.jpg`, `.jpeg`, `.pdf`, `.svg`, `.js`) to either:
   - `frontend/maps/` or `frontend/public/maps/` using GMCH/Leaflet assets (`gmch*`, `*leaflet*`, Leaflet SVG/JS files)
   - `backend/uploads/` (uploaded user maps)
2. Run:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\bootstrap_training_maps.py
.\.venv\Scripts\python.exe scripts\train_layout_model.py
```

## API Endpoints
- `GET /api/v1/maps/training`: List training maps and current model stats.
- `POST /api/v1/maps/training/retrain`: Retrain model from current catalog (requires login).
