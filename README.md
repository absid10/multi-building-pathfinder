# Multi-Building Indoor Wayfinder System

Final-year major project focused on indoor navigation across multi-building and multi-floor environments (hospital and campus-style layouts).

This platform combines graph-based routing, map ingestion, and modern web deployment to solve a real navigation pain point: helping users move from one indoor location to another quickly and accurately.

## Project Identity

- Project: Smart Hospital Navigation and Multi-Building Indoor Wayfinding Platform
- Repository: multi-building-pathfinder
- Academic context: Final Year Project (B.Tech CSE, Batch 2026)
- Owner: Abdullah Ahmed Siddiqui
- Email: siddiquiabdullahahmed75@gmail.com
- GitHub: https://github.com/absid10
- LinkedIn: https://www.linkedin.com/in/absid10/

## Resume Reference Snapshot

- Profile summary: Aspiring Software Engineer with strong fundamentals in full-stack development, data structures, and databases.
- Degree context: B.Tech Computer Science and Engineering, Government College of Engineering (GECA), expected 2026.
- Relevant skills used in this project: React, TypeScript, Python, SQL, Flask, PostgreSQL, Git/GitHub, A* algorithm, graph modeling.
- Project role alignment: Problem solving, architecture design, API integration, debugging, deployment, and documentation.

## Live Deployment

- Frontend (Vercel): https://multi-building-pathfinder.vercel.app/
- Backend API (Render): https://multi-building-pathfinder.onrender.com
- Database (Neon PostgreSQL): configured via DATABASE_URL
- Health endpoint: https://multi-building-pathfinder.onrender.com/api/v1/health

## Problem Statement

Large institutions such as hospitals and colleges are difficult to navigate because of:

- Multiple connected buildings
- Multi-floor transitions
- Complex corridors and intersections
- User unfamiliarity with the physical layout

This project models indoor spaces as weighted graphs and computes shortest routes using A* pathfinding, then visualizes the route on interactive maps.

## Core Features

- Multi-building and multi-floor routing
- A* shortest path computation over node-edge graphs
- Interactive map view with route rendering
- Auth flows (email/password and Google)
- Uploaded map pipeline with analysis status tracking
- Public/private map visibility management
- Route and map APIs for extensibility

## Technical Stack

Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS + shadcn/ui

Backend

- Python 3
- Flask
- SQLAlchemy + Flask-Migrate
- JWT auth
- Optional Redis + RQ worker for async analysis

Database and Deployment

- Neon PostgreSQL
- Render (backend hosting)
- Vercel (frontend hosting)

## Architecture Overview

- Frontend SPA calls backend REST endpoints under /api/v1
- Backend persists users/maps/navigation metadata in PostgreSQL (Neon)
- Optional background worker handles map analysis jobs
- Graph-based routing engine computes indoor paths and returns route segments

## Repository Structure

```text
multi-building-pathfinder/
├── backend/
│   ├── app/
│   ├── migrations/
│   ├── scripts/
│   ├── .env.example
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── docs/
├── srsdoc.md
├── vercel.json
└── README.md
```

## Local Development Setup

Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL connection string (Neon or local Postgres)

1. Clone repository

```bash
git clone https://github.com/absid10/multi-building-pathfinder.git
cd multi-building-pathfinder
```

2. Backend setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python scripts\migrate_db.py
python run.py
```

3. Frontend setup (new terminal)

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on Vite dev server (typically http://localhost:5173) and connects to backend via configured API base URL.

## Environment Variables

Backend (.env)

- DATABASE_URL=postgresql://... (Neon pooled connection recommended at runtime)
- SECRET_KEY=...
- TOKEN_EXPIRY=86400
- GOOGLE_CLIENT_ID=...
- REDIS_URL=redis://localhost:6379/0
- UPLOAD_FOLDER=./uploads
- OPENAI_API_KEY=...
- OPENAI_MODEL=gpt-4o-mini

Frontend (.env)

- VITE_API_BASE_URL=https://multi-building-pathfinder.onrender.com/api/v1
- VITE_GOOGLE_CLIENT_ID=...

## Deployment Guide

### Vercel (Frontend)

This repo already includes vercel.json configured for the frontend directory.

- Framework: Vite
- Install command: cd frontend && npm ci
- Build command: cd frontend && npm run build
- Output directory: frontend/dist

Set Vercel environment variables:

- VITE_API_BASE_URL
- VITE_GOOGLE_CLIENT_ID

### Render (Backend)

Create a Render Web Service pointing to this repository.

Recommended settings:

- Root directory: backend
- Build command: pip install -r requirements.txt
- Start command: python run.py
- Runtime: Python 3

Set Render environment variables:

- DATABASE_URL (Neon connection string)
- SECRET_KEY
- TOKEN_EXPIRY
- GOOGLE_CLIENT_ID
- REDIS_URL (optional unless worker enabled)
- OPENAI_API_KEY (optional if AI analysis used)
- OPENAI_MODEL

After first deploy, run migrations once:

```powershell
cd backend
.venv\Scripts\activate
python scripts\migrate_db.py
```

### Neon (PostgreSQL)

1. Create Neon project and database.
2. Copy pooled connection string from Neon dashboard.
3. Set that value as DATABASE_URL in Render backend service.
4. Run backend migrations.
5. Verify table creation and row updates in Neon SQL editor.

Verification query:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

## API Snapshot

Common endpoints:

- GET /api/v1/health
- POST /api/v1/auth/signup
- POST /api/v1/auth/login
- POST /api/v1/auth/google
- GET /api/v1/auth/me
- POST /api/v1/routes
- POST /api/v1/maps/upload
- GET /api/v1/maps/list
- GET /api/v1/maps/public
- GET /api/v1/maps/{mapId}/status

## Pathfinding Model

The routing engine is based on A* search:

- g(n): path cost from source to current node
- h(n): heuristic estimate to destination
- f(n) = g(n) + h(n)

Graph entities:

- Nodes: intersections, connectors, room access points
- Edges: weighted walkable connections
- Transitions: stairs/elevator/building connectors

## Final-Year Project Outcomes

- Designed and implemented an end-to-end full-stack wayfinding system
- Applied graph algorithms (A*) to real navigation datasets
- Built production-style deployment on Vercel + Render + Neon
- Implemented modular architecture for future scaling (AI map parsing, role-based access, realtime updates)

## Future Scope

- AR-assisted indoor guidance
- CAD/OCR-based automatic graph extraction
- Accessibility-first routing profiles
- Crowd-aware dynamic rerouting
- Multi-tenant enterprise dashboard

## Contributing

Contributions are welcome.

1. Fork the repo
2. Create a feature branch
3. Commit focused changes
4. Open a pull request with clear description

## License

This project is licensed under the MIT License. See the LICENSE file for details.
