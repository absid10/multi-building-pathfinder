# Multi-Building Pathfinder

An indoor wayfinding platform for hospitals and multi-building campuses. Upload floor plan images or PDFs, let AI analyse them, and provide visitors with interactive turn-by-turn navigation across any building or floor.

## Project Layout

```text
multi-building-pathfinder/
|- frontend/   Vite + React + TypeScript client
|- backend/    Flask + PostgreSQL API server
|- docs/       Product roadmap
`- README.md
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Router |
| Backend | Flask, SQLAlchemy, Flask-Migrate, PostgreSQL (SQLite for local dev) |
| Auth | JWT (email/password) + Google OAuth 2.0 |
| Map analysis | OpenAI API, PyMuPDF, Redis + RQ worker queue |
| Pathfinding | A* algorithm |

## What Is Already Implemented

**Navigation**
- Interactive indoor map with zoom, pan, destination selection, and floor switching.
- A* based pathfinding across multi-building graphs.
- Live navigation summary card with walking distance and ETA.
- Turn-by-turn guidance generated from path geometry.
- Indoor GPS tracking simulation (real-time movement along route).

**Authentication**
- Email/password sign-up and login.
- Google OAuth 2.0 login.
- JWT session tokens with configurable expiry.

**Map Management**
- Upload floor plan images (PNG, JPG, JPEG) or PDFs (up to 25 MB).
- AI-powered map analysis: automatically detects corridors, rooms, and POIs.
- Per-map public/private visibility toggle.
- Dashboard for reviewing and managing uploaded maps.
- Public maps gallery visible to all visitors without login.

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with public maps gallery |
| `/dashboard` | Map upload and management workspace |
| `/navigate/:mapId` | Interactive navigation for a specific map |

## Backend API Reference

### Core

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/buildings` | List all buildings |
| GET | `/api/v1/buildings/{buildingCode}/floors` | List floors for a building |
| GET | `/api/v1/floors/{floorId}/map` | Get floor map with nodes, edges, and POIs |
| POST | `/api/v1/routes` | Compute A* route between two nodes |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/signup` | Register with email and password |
| POST | `/api/v1/auth/login` | Login with email and password |
| POST | `/api/v1/auth/google` | Login or register with a Google ID token |
| GET | `/api/v1/auth/me` | Get current authenticated user |

### Map Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/maps/upload` | Upload a floor plan file for AI analysis |
| GET | `/api/v1/maps/{mapId}/status` | Poll analysis job status |
| GET | `/api/v1/maps/list` | List maps uploaded by the current user |
| GET | `/api/v1/maps/public` | List all public analysed maps |
| PATCH | `/api/v1/maps/{mapId}/privacy` | Toggle map public/private visibility |
| DELETE | `/api/v1/maps/{mapId}` | Delete an uploaded map |

## Local Setup

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Copy `frontend/.env.example` to `frontend/.env` and set:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # then fill in your values
python run.py
```

Key variables in `backend/.env`:

```env
DATABASE_URL=sqlite:///hospital_nav.db   # or a postgres:// URL
SECRET_KEY=replace-with-long-random-secret
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
UPLOAD_FOLDER=./uploads
```

### Redis Worker (required for AI map analysis)

Start a Redis server, then in a separate terminal:

```bash
cd backend
rq worker --url redis://localhost:6379/0
```

## Deploy Frontend To Vercel (Monorepo)

This repo includes a root-level `vercel.json` configured to build and deploy only the Vite app under `frontend/`.

1. Push this repository to GitHub.
2. In Vercel, import the GitHub repository.
3. Keep the project root as the repository root (do not change to a subfolder).
4. Add environment variable in Vercel project settings:
   - `VITE_API_BASE_URL=https://<your-backend-domain>/api/v1`
5. Deploy.

## Startup and Productization Direction
- AI floorplan ingestion from PDF, CAD, and image files.
- Multi-tenant SaaS for hospitals, airports, malls, and campuses.
- Real-time occupancy and route-closure aware navigation.
- Indoor positioning with BLE + Wi-Fi + IMU sensor fusion.

Detailed roadmap: [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md)
