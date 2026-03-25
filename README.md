# Smart Hospital Navigation Monorepo

A product-focused indoor wayfinding platform for hospitals and multi-building campuses. The current version includes an interactive React frontend and a Flask + PostgreSQL backend scaffold for production-ready APIs.

## Project Layout

```text
smart-hospital-navigation/
|- frontend/  Vite + React TypeScript client
|- backend/   Flask + PostgreSQL API foundation
|- docs/      Product roadmap and startup direction
`- README.md
```

## What Is Already Implemented
- Interactive indoor map with zoom, pan, destination selection, and floor switching.
- A* based pathfinding across building graphs.
- Live navigation summary card with walking distance and ETA.
- Turn-by-turn style guidance generated from path geometry.
- Indoor GPS style tracking simulation (real-time movement along route).
- Flask backend app factory with SQLAlchemy models and route APIs.

## Backend APIs Available
- GET /api/v1/health
- GET /api/v1/buildings
- GET /api/v1/buildings/{buildingCode}/floors
- GET /api/v1/floors/{floorId}/map
- POST /api/v1/routes

## Local Setup

Frontend:

```powershell
cd smart-hospital-navigation\frontend
npm install
npm run dev
```

Backend:

```powershell
cd smart-hospital-navigation\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

## Deploy Frontend To Vercel (Monorepo)

This repo includes a root-level `vercel.json` configured to build and deploy only the Vite app under `frontend/`.
That means extra folders like `backend/`, `docs/`, or legacy folders such as `v1/` do not affect frontend deployment output.

1. Push this repository to GitHub.
2. In Vercel, import the GitHub repository.
3. Keep project root as repository root (do not change to subfolder).
4. Add environment variable in Vercel project settings:
	- `VITE_API_BASE_URL=https://<your-backend-domain>/api/v1`
5. Deploy.

For local frontend environment configuration, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL`.

## Startup and Productization Direction
- AI floorplan ingestion from PDF, CAD, and image files.
- Multi-tenant SaaS for hospitals, airports, malls, and campuses.
- Real-time occupancy and route-closure aware navigation.
- Indoor positioning with BLE + Wi-Fi + IMU sensor fusion.

Detailed roadmap: docs/PRODUCT_ROADMAP.md
