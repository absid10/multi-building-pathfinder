# Smart Hospital Navigation and Multi-Building Indoor Wayfinder

Full-stack indoor navigation system for hospitals and campus-style environments with map upload, AI-assisted parsing, route generation, and map sharing workflows.

![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb?logo=react)
![Backend](https://img.shields.io/badge/Backend-Flask-000000?logo=flask)
![Database](https://img.shields.io/badge/Database-SQLAlchemy%20%2F%20PostgreSQL-336791?logo=postgresql)
![Queue](https://img.shields.io/badge/Queue-Redis%20%2B%20RQ-dc382d?logo=redis)
![Status](https://img.shields.io/badge/Status-Active%20Development-success)

## What this project includes

- Interactive multi-building and multi-floor wayfinding UI.
- A* graph-based routing for seeded and uploaded maps.
- Upload pipeline for PNG, JPG, and PDF map files.
- Analysis queue support with fallback inline processing when Redis/RQ is unavailable.
- Uploaded map management: explore, rename, private/public, delete.
- Training pipeline for map-layout priors with dashboard visibility.
- About, Future Enhancements, Contact, and Support sections integrated into the product UI.

## Table of Contents

- [System Overview](#system-overview)
- [Feature Highlights](#feature-highlights)
- [Architecture](#architecture)
- [Repository Layout](#repository-layout)
- [API Endpoints](#api-endpoints)
- [Run Locally](#run-locally)
- [Training Pipeline](#training-pipeline)
- [Deployment](#deployment)
- [Screens and User Flows](#screens-and-user-flows)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

## System Overview

The platform has two major layers:

1. Frontend application
	 - React + TypeScript SPA
	 - Map interaction, routing, upload management, training panel, and documentation pages

2. Backend application
	 - Flask API with SQLAlchemy
	 - Authentication, map upload lifecycle, analysis orchestration, and graph-serving endpoints

Map analysis supports two execution modes:

- Primary: Redis + RQ worker queue
- Fallback: inline analysis in API process if queue is unreachable

This allows local development and production deployments to remain usable under different infra conditions.

## Feature Highlights

### Indoor Navigation

- Multi-floor route computation using A*.
- Building-to-building transitions in seeded maps.
- Destination selection by POI.
- Route rendering and live navigation guidance.

### Uploaded Map Experience

- Upload map files from dashboard.
- Polling-based status updates from analyzing to ready.
- Explore analyzed uploaded maps in dedicated route:
	- /navigate/upload/:mapId
- Rename map directly from dashboard card.
- Toggle private/public visibility.
- Delete map with ownership checks.

### AI and Training

- Local training map catalog (reference files + uploads).
- Retrainable lightweight layout model.
- Model priors used in heuristic parser when AI inference is unavailable.
- Training panel shows sample count, source split, and retrain action.

## Architecture

### Frontend

- React, TypeScript, Vite
- Tailwind CSS
- React Router
- Lucide Icons

### Backend

- Flask app factory pattern
- SQLAlchemy models
- Flask-Migrate
- Redis + RQ (optional queue path)
- OpenAI SDK integration (optional)
- PyMuPDF for PDF text extraction

### Routing and Data Model

- Graph entities: nodes, edges, POIs
- Route engine: A* over weighted edges
- Uploaded map analysis result persisted as JSON graph payload

## Repository Layout

```text
smart-hospital-navigation/
|- frontend/                  # React + Vite + TypeScript client
|- backend/                   # Flask API, models, services, scripts
|- docs/                      # Project docs and plans
|- references for frontend/   # Reference PDFs for parser/training bootstrap
|- vercel.json                # Monorepo deploy config for frontend
|- srsdoc.md                  # Full SRS document for this project
`- README.md
```

## API Endpoints

Base path: /api/v1

### Health and Core

- GET /health
- GET /buildings
- GET /buildings/{buildingCode}/floors
- GET /floors/{floorId}/map
- POST /routes

### Authentication

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
- PATCH /maps/{mapId}/name
- PATCH /maps/{mapId}/privacy
- DELETE /maps/{mapId}

### Training

- GET /maps/training
- POST /maps/training/retrain

## Run Locally

### Backend setup

```powershell
cd smart-hospital-navigation\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python scripts\migrate_db.py
python run.py
```

API default URL: http://localhost:5000

Optional worker (second terminal):

```powershell
cd smart-hospital-navigation\backend
.venv\Scripts\activate
python scripts\run_worker.py
```

### Frontend setup

```powershell
cd smart-hospital-navigation\frontend
npm install
npm run dev
```

Optional frontend env file:

```text
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

## Training Pipeline

Bootstrap catalog and retrain local layout model:

```powershell
cd smart-hospital-navigation\backend
.venv\Scripts\python.exe scripts\bootstrap_training_maps.py
.venv\Scripts\python.exe scripts\train_layout_model.py
```

Generated artifacts:

- backend/data/training/catalog.json
- backend/data/training/layout_model.json
- backend/data/training/README.md

## Deployment

### Frontend on Vercel

This repository includes root-level vercel.json to deploy the frontend app from monorepo context.

Required environment variable:

- VITE_API_BASE_URL=https://<your-backend-domain>/api/v1

### Backend deployment

Deploy backend with the following env variables at minimum:

- DATABASE_URL
- SECRET_KEY
- REDIS_URL (recommended)
- OPENAI_API_KEY (optional)
- OPENAI_MODEL

## Screens and User Flows

- Landing: browse public maps and navigate.
- Dashboard: manage uploads and training panel.
- Uploaded map cards: explore, rename, privacy toggle, delete.
- Uploaded navigator route for generated map graph traversal.
- About / Future / Contact / Support access from header and footer.

## Troubleshooting

- Upload shows analyzing for long duration:
	- verify backend API is running
	- verify Redis worker if queue mode is expected
	- system should fallback inline if queue is unavailable

- Explore does not open uploaded map:
	- restart backend after pulling latest changes to load new endpoints
	- ensure map status is analyzed

- Auth requests timeout locally:
	- confirm backend .env and DB initialization
	- run migration script before starting API

## Roadmap

- Better OCR for image-only floorplans.
- CAD/BIM ingestion pipeline for richer geometry extraction.
- Role-based moderation for public maps.
- End-to-end integration tests for upload to navigation journey.
- Frontend code-splitting for large bundle optimization.
- AR-guided indoor navigation and advanced indoor positioning.

## Contributing

1. Create a feature branch.
2. Keep commits focused and testable.
3. Validate frontend and backend locally.
4. Open PR with screenshots for UI-impacting updates.

---
Project by Abdullah Ahmed Siddiqui
