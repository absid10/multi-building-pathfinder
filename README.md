# Smart Hospital Navigation

Indoor wayfinding platform for hospitals and multi-building campuses, with map upload, AI-assisted map parsing, route generation, and shareable navigation.

## Overview

This repository contains a full-stack implementation with:

- A React + Vite frontend for map browsing, navigation, upload management, and admin workflows.
- A Flask backend for auth, map upload lifecycle, analysis orchestration, and navigation graph APIs.
- A lightweight local training pipeline that maintains a training-map catalog and retrainable layout priors.

The project currently supports:

- Seeded map navigation (GMCH and GECA campus flows).
- Uploaded map lifecycle: upload, analysis status, privacy toggle, rename, delete, and explore.
- Uploaded map explorer route for traversing generated nodes, POIs, and paths.
- Public map discovery and explore entry points.

## Repository Structure

```text
smart-hospital-navigation/
|- frontend/                  # React + Vite + TypeScript client
|- backend/                   # Flask API + SQLAlchemy + map analysis services
|- docs/                      # Additional product and planning docs
|- references for frontend/   # Sample map PDFs used for training/analysis bootstrap
|- vercel.json                # Frontend deployment config for Vercel
`- README.md
```

## Core Features

### Navigation

- Multi-building and multi-floor indoor navigation.
- A* pathfinding engine on graph nodes/edges.
- POI-based destination selection.
- Floor transition and cross-building route handling.
- Campus view with map-specific behavior.

### Upload and Analysis

- Upload PNG/JPG/PDF floor plans.
- Async analysis through Redis + RQ when available.
- Automatic inline fallback analysis when queue infra is unavailable.
- Status polling in dashboard for smooth analyzing -> ready transitions.

### Uploaded Map Management

- View uploaded maps in dashboard.
- Rename uploaded maps.
- Toggle public/private visibility.
- Delete maps.
- Explore analyzed uploaded maps through dedicated route:
	- /navigate/upload/:mapId

### AI Training Workflow

- Maintains local training catalog from:
	- references for frontend/
	- backend/uploads/
- Produces retrainable lightweight layout model at:
	- backend/data/training/layout_model.json
- Exposes training overview and retrain APIs.
- Includes dashboard panel listing training maps and model stats.

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide icons

### Backend

- Flask
- SQLAlchemy
- Flask-Migrate
- Redis + RQ
- PyMuPDF
- OpenAI SDK (optional, configurable)

### Data and Algorithms

- Graph-based routing model (nodes, edges, POIs)
- A* pathfinding
- Heuristic parser with optional OpenAI enhancement
- Local training priors for building/floor inference

## API Summary

Base: /api/v1

### Health and Core

- GET /health
- GET /buildings
- GET /buildings/{buildingCode}/floors
- GET /floors/{floorId}/map
- POST /routes

### Auth

- POST /auth/signup
- POST /auth/login
- POST /auth/google
- GET /auth/me

### Maps

- POST /maps/upload
- GET /maps/list
- GET /maps/public
- GET /maps/{mapId}
- GET /maps/{mapId}/status
- PATCH /maps/{mapId}/privacy
- PATCH /maps/{mapId}/name
- DELETE /maps/{mapId}

### Training

- GET /maps/training
- POST /maps/training/retrain

## Local Development

## 1) Backend

```powershell
cd smart-hospital-navigation\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python scripts\migrate_db.py
python run.py
```

Backend runs on http://localhost:5000.

Optional worker process (separate terminal):

```powershell
cd smart-hospital-navigation\backend
.venv\Scripts\activate
python scripts\run_worker.py
```

## 2) Frontend

```powershell
cd smart-hospital-navigation\frontend
npm install
npm run dev
```

Set frontend API base in frontend/.env (if needed):

```text
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

## Training Utilities

Bootstrap catalog and train local layout model:

```powershell
cd smart-hospital-navigation\backend
.venv\Scripts\python.exe scripts\bootstrap_training_maps.py
.venv\Scripts\python.exe scripts\train_layout_model.py
```

Training artifacts:

- backend/data/training/catalog.json
- backend/data/training/layout_model.json
- backend/data/training/README.md

## Deployment Notes

### Frontend (Vercel)

The repository includes root vercel.json configured for monorepo frontend build targeting frontend/.

Required env on hosting:

- VITE_API_BASE_URL=https://<your-backend-domain>/api/v1

### Backend

Deploy Flask backend to your preferred host (Render, Railway, Azure, etc.) with:

- DATABASE_URL
- SECRET_KEY
- REDIS_URL (optional but recommended for queue)
- OPENAI_API_KEY (optional)
- OPENAI_MODEL

## Current Product Pages

- Landing page with map exploration entry.
- Dashboard with public maps and your maps tabs.
- About page.
- Future Enhancements page.
- Contact page with email, GitHub, and LinkedIn links.

## Known Gaps and Next Priorities

- Improve OCR for image-only maps before graph extraction.
- Add stronger graph quality validation for uploaded maps.
- Add role-based moderation for public map publication.
- Add e2e integration tests for upload -> analyze -> navigate flow.
- Add chunk splitting strategy for frontend bundle optimization.

## Contributing

1. Create a feature branch.
2. Make focused commits.
3. Run backend and frontend validation locally.
4. Open PR with screenshots for UI-impacting updates.

## License

Internal/academic project usage unless explicitly relicensed.
