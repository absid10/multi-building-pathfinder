# Multi-Building Pathfinder — Smart Indoor Navigation Platform

A full-stack, startup-ready indoor wayfinding platform for hospitals, campuses, airports, and multi-building facilities. Upload architectural floor plans, let the AI parse them, and give your users interactive turn-by-turn indoor navigation with live route tracking — all from a single, deployable monorepo.

---

## Table of Contents

1. [Overview](#overview)
2. [Live Demo & Deployment](#live-demo--deployment)
3. [Key Features](#key-features)
4. [Architecture](#architecture)
5. [Project Layout](#project-layout)
6. [Technology Stack](#technology-stack)
7. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Frontend Setup](#frontend-setup)
   - [Backend Setup](#backend-setup)
   - [Running the Background Worker](#running-the-background-worker)
8. [Environment Variables](#environment-variables)
   - [Backend Environment Variables](#backend-environment-variables)
   - [Frontend Environment Variables](#frontend-environment-variables)
9. [API Reference](#api-reference)
   - [Health](#health)
   - [Buildings & Floors](#buildings--floors)
   - [Routing](#routing)
   - [Authentication](#authentication)
   - [Map Management](#map-management)
10. [Database Schema](#database-schema)
11. [Pathfinding Algorithm](#pathfinding-algorithm)
12. [AI Map Analysis Pipeline](#ai-map-analysis-pipeline)
13. [Authentication System](#authentication-system)
14. [Deploying to Vercel (Frontend)](#deploying-to-vercel-frontend)
15. [Deploying the Backend](#deploying-the-backend)
16. [Database Migrations](#database-migrations)
17. [Roadmap](#roadmap)
18. [Contributing](#contributing)

---

## Overview

Multi-Building Pathfinder is an open-source indoor navigation system designed from the ground up for large, complex facilities. Unlike outdoor GPS, indoor spaces have no universal positioning standard — this platform solves that by letting facility managers upload floor plans (PDF or image), automatically analysing them with AI, and generating a navigable graph that end users can query in real time.

The system models each facility as a collection of **buildings → floors → nodes → edges**, where nodes represent physical waypoints (corridors, stairs, lifts, rooms) and edges carry the real-world walking distance between them. A server-side **A\*** search returns the optimal path, which the React frontend renders as an animated, turn-by-turn indoor navigation experience.

**Who is this for?**

| Audience | Use Case |
|---|---|
| Hospital staff & patients | Find wards, labs, pharmacies, and exits quickly |
| Airport operators | Guide passengers between gates, lounges, and services |
| University campuses | Navigate between lecture halls across multiple buildings |
| Shopping malls | Retail wayfinding and customer journey analytics |
| Facility managers | Upload and publish navigable maps with no code required |

---

## Live Demo & Deployment

The frontend is configured for zero-config deployment to [Vercel](https://vercel.com) via the root-level `vercel.json`. The backend can be deployed to any Python-compatible platform (Render, Railway, Fly.io, AWS, etc.).

See [Deploying to Vercel](#deploying-to-vercel-frontend) and [Deploying the Backend](#deploying-the-backend) for step-by-step instructions.

---

## Key Features

### 🗺️ Interactive Indoor Maps
- Zoomable, pannable SVG/canvas map renderer built in React.
- Multi-floor support with a floor switcher for buildings with many levels.
- Visual distinction between corridors, stairs, elevators, rooms, and points of interest (POIs).
- Destination selector with fuzzy search across all POIs on a floor or across the entire campus.

### 🧭 A\* Pathfinding Engine
- Server-side A\* algorithm with Euclidean distance as the admissible heuristic.
- Graph built from database-persisted nodes and weighted, optionally bidirectional edges.
- Returns the optimal node path and the total walking distance in metres.
- Accessibility flag on edges enables accessible-only route filtering (ramps, lifts, wide corridors).

### 📍 Live Navigation Experience
- Navigation summary card showing walking distance (converted to feet for display) and estimated arrival time. The API returns distances in metres; the frontend performs the unit conversion.
- Turn-by-turn instruction generation (left turn, right turn, straight ahead, destination reached).
- Simulated indoor GPS tracking — an animated marker moves along the computed route in real time.
- Route re-centring and visual highlight of the active path segment.

### 📤 AI-Powered Map Upload Pipeline
- Authenticated users can upload floor plans as **PDF**, **PNG**, or **JPG** files (up to 25 MB).
- Files are saved to disk and a background **RQ** (Redis Queue) worker picks up the analysis job asynchronously, keeping the HTTP response instant.
- **OpenAI GPT-4o-mini** parses extracted PDF text and infers building count, floor count, building names, and confidence score.
- Deterministic heuristic fallback activates automatically when OpenAI is unavailable or the API call fails — ensuring the pipeline is always operational.
- Maps can be marked **public** or **private** by the uploader at any time.

### 🔐 Authentication & User Management
- Email/password registration and login with **PBKDF2-SHA256** password hashing.
- **Google OAuth 2.0** sign-in using the official `google-auth` library for server-side token verification — no insecure client-side-only flows.
- Stateless **JWT** bearer tokens with configurable expiry.
- Support for multiple Google OAuth client IDs (web + mobile) from a single comma-separated environment variable.
- `GET /api/v1/auth/me` endpoint for session hydration on page load.

### 🏗️ Production-Ready Backend
- Flask application factory pattern with environment-driven configuration.
- SQLAlchemy ORM with **Flask-Migrate / Alembic** for version-controlled schema changes.
- First-class **PostgreSQL** support via `psycopg3`; SQLite fallback for local development with zero extra dependencies.
- CORS configured with regex-based allow-list (localhost, LAN, Vercel preview URLs, and explicit production origins).
- Health check endpoint for load balancer probes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Client                     │
│   React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui    │
│   TanStack Query  ·  React Router v6  ·  Google OAuth SDK   │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTPS / REST JSON
┌────────────────────────▼────────────────────────────────────┐
│                    Flask REST API (Python)                   │
│  /api/v1  ·  JWT auth  ·  CORS  ·  SQLAlchemy ORM           │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
┌──────────▼──────────┐   ┌──────────▼──────────────────────┐
│  PostgreSQL / SQLite │   │  Redis  +  RQ Worker            │
│  Buildings, Floors,  │   │  Async map analysis jobs        │
│  Nodes, Edges, POIs  │   │  OpenAI GPT-4o-mini parser      │
│  Users, UploadedMaps │   │  Deterministic fallback parser  │
└─────────────────────┘   └─────────────────────────────────┘
```

### Request Lifecycle — Route Computation

1. The React frontend resolves start and end node IDs from the user's destination selection.
2. `POST /api/v1/routes` is called with `{ startNodeId, endNodeId }`.
3. The Flask route handler loads all nodes and edges from the database.
4. The `find_route` service runs A\* and returns `{ node_ids, distance_m }`.
5. The frontend renders the path on the canvas and begins the navigation simulation.

### Request Lifecycle — Map Upload

1. Authenticated user submits a file via `POST /api/v1/maps/upload`.
2. The API saves the file, creates an `UploadedMap` record with status `"analyzing"`, and enqueues an RQ job.
3. The HTTP response returns immediately with the map record (202-style).
4. The RQ worker calls `parse_map(file_path)`, which either uses OpenAI or the heuristic parser.
5. The map record is updated to `"analyzed"` with building/floor counts and the full AI result JSON.
6. The frontend polls `GET /api/v1/maps/{mapId}/status` until the status is no longer `"analyzing"`.

---

## Project Layout

```text
multi-building-pathfinder/
├── frontend/                  Vite + React TypeScript SPA
│   ├── src/
│   │   ├── components/        UI components (map, navigation, auth, upload)
│   │   ├── pages/             Route-level page components
│   │   ├── contexts/          React context providers (AuthContext)
│   │   ├── hooks/             Custom React hooks
│   │   ├── config/            API base URL and app-wide constants
│   │   ├── data/              Static seed / mock data
│   │   └── utils/             Utility functions
│   ├── public/                Static assets
│   ├── .env.example           Frontend environment variable template
│   └── package.json
│
├── backend/                   Flask + SQLAlchemy REST API
│   ├── app/
│   │   ├── __init__.py        App factory (create_app)
│   │   ├── config.py          Environment-driven configuration
│   │   ├── extensions.py      SQLAlchemy + Migrate instances
│   │   ├── models.py          ORM models (User, Building, Floor, Node, Edge, POI, UploadedMap)
│   │   ├── routes.py          Core API blueprint (/api/v1)
│   │   ├── auth_routes.py     Auth blueprint (/api/v1/auth)
│   │   ├── map_upload_routes.py  Map management blueprint (/api/v1/maps)
│   │   └── services/
│   │       ├── routing.py     A* pathfinding engine
│   │       ├── map_parser.py  OpenAI + heuristic map analysis
│   │       ├── map_analysis_jobs.py  RQ background job handler
│   │       └── queue.py       Redis/RQ queue factory
│   ├── migrations/            Alembic migration scripts
│   ├── scripts/
│   │   ├── migrate_db.py      Helper script to run DB migrations
│   │   └── run_worker.py      Starts the RQ background worker
│   ├── requirements.txt
│   ├── run.py                 Development server entry point
│   └── .env.example           Backend environment variable template
│
├── docs/
│   └── PRODUCT_ROADMAP.md     Product vision and feature roadmap
│
├── vercel.json                Vercel monorepo deployment config
└── README.md
```

---

## Technology Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build Tool | [Vite 5](https://vitejs.dev/) |
| Styling | [Tailwind CSS v3](https://tailwindcss.com/) |
| Component Library | [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) |
| Routing | [React Router v6](https://reactrouter.com/) |
| Data Fetching | [TanStack Query v5](https://tanstack.com/query) |
| Forms | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Charts | [Recharts](https://recharts.org/) |
| Google Auth | [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google) |
| Icons | [Lucide React](https://lucide.dev/) |

### Backend

| Layer | Technology |
|---|---|
| Framework | [Flask 3](https://flask.palletsprojects.com/) |
| ORM | [Flask-SQLAlchemy 3](https://flask-sqlalchemy.palletsprojects.com/) |
| Migrations | [Flask-Migrate](https://flask-migrate.readthedocs.io/) (Alembic) |
| Database | [PostgreSQL](https://www.postgresql.org/) via [psycopg3](https://www.psycopg.org/psycopg3/) |
| Dev Database | SQLite (automatic fallback) |
| Auth | [PyJWT](https://pyjwt.readthedocs.io/) + [google-auth](https://google-auth.readthedocs.io/) |
| Password Hashing | Werkzeug PBKDF2-SHA256 |
| CORS | [Flask-CORS](https://flask-cors.readthedocs.io/) |
| Task Queue | [RQ (Redis Queue)](https://python-rq.org/) + [Redis](https://redis.io/) |
| AI Analysis | [OpenAI Python SDK](https://github.com/openai/openai-python) (GPT-4o-mini) |
| PDF Parsing | [PyMuPDF (fitz)](https://pymupdf.readthedocs.io/) |

---

## Getting Started

### Prerequisites

| Tool | Minimum Version | Notes |
|---|---|---|
| Node.js | 18.x | 20.x or later recommended |
| npm | 9.x | Comes bundled with Node.js |
| Python | 3.11 | 3.12+ also supported |
| Redis | 6.x | Required only for the map upload/analysis feature |
| PostgreSQL | 14.x | Optional — SQLite is used automatically when `DATABASE_URL` is not set |

---

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Copy the environment variable template
cp .env.example .env
# Then open .env and set VITE_API_BASE_URL to your backend URL, e.g.:
# VITE_API_BASE_URL=http://localhost:5000/api/v1

# 4. Start the development server
npm run dev
```

The Vite dev server starts on `http://localhost:8080` by default (configurable in `vite.config.ts`).

**Other frontend commands:**

```bash
npm run build        # Production build → frontend/dist/
npm run build:dev    # Development build (source maps included)
npm run preview      # Serve the production build locally
npm run lint         # Run ESLint
```

---

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create a virtual environment
python -m venv .venv

# 3. Activate the virtual environment
# On macOS / Linux:
source .venv/bin/activate
# On Windows (PowerShell):
.venv\Scripts\activate

# 4. Install Python dependencies
pip install -r requirements.txt

# 5. Copy and configure the environment file
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and SECRET_KEY (see Environment Variables below)

# 6. Apply database migrations
python scripts/migrate_db.py

# 7. Start the development server
python run.py
```

The Flask API starts on `http://localhost:5000`. The root endpoint (`GET /`) returns a JSON service descriptor to confirm the API is running.

---

### Running the Background Worker

The map upload analysis pipeline requires a Redis instance and a running RQ worker. Open a **second terminal** in the same virtual environment:

```bash
# Terminal 1 — API server
cd backend
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
python run.py

# Terminal 2 — Background worker
cd backend
source .venv/bin/activate
python scripts/run_worker.py
```

> **Note:** Without a running worker, map uploads will return a `503 Analysis queue is unavailable` error. Redis must be reachable at the URL set in `REDIS_URL`.

---

## Environment Variables

### Backend Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | No | SQLite file | Full database connection string. Supports `postgresql://`, `postgresql+psycopg://`, and `postgres://` (auto-normalised). Omit to use a local SQLite file. |
| `SECRET_KEY` | **Yes** | `change-this-secret` | Random secret used to sign JWT tokens. Use a long, random string in production. |
| `TOKEN_EXPIRY` | No | `86400` | JWT token lifetime in seconds (default: 24 hours). |
| `GOOGLE_CLIENT_ID` | No | _(empty)_ | Google OAuth 2.0 client ID(s). Comma-separate multiple IDs to support web and mobile clients simultaneously. |
| `REDIS_URL` | No | `redis://localhost:6379/0` | Redis connection URL used by RQ for the map analysis worker queue. |
| `UPLOAD_FOLDER` | No | `./uploads` | Filesystem path where uploaded map files are stored. |
| `OPENAI_API_KEY` | No | _(empty)_ | OpenAI API key. When set, the AI parser is used. When absent, the deterministic heuristic parser runs instead. |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model identifier used for map structure inference. |
| `CORS_ORIGIN` | No | _(auto)_ | Comma-separated list of additional allowed CORS origins. Localhost, LAN addresses, and `*.vercel.app` are always allowed. |

### Frontend Environment Variables

Copy `frontend/.env.example` to `frontend/.env`:

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | **Yes** | _(none)_ | Full URL to the backend API, e.g. `http://localhost:5000/api/v1` for local development or `https://your-api.example.com/api/v1` in production. |

---

## API Reference

All endpoints are prefixed with `/api/v1`. All request and response bodies use `application/json`. Authenticated endpoints require an `Authorization: Bearer <token>` header.

---

### Health

#### `GET /api/v1/health`

Returns `200 OK` when the API is running. Used by load balancers and uptime monitors.

**Response**
```json
{ "status": "ok" }
```

---

### Buildings & Floors

#### `GET /api/v1/buildings`

Returns all buildings ordered alphabetically by name.

**Response**
```json
[
  {
    "id": 1,
    "code": "MAIN",
    "name": "Main Hospital Block",
    "latitude": 37.7749,
    "longitude": -122.4194
  }
]
```

---

#### `GET /api/v1/buildings/{buildingCode}/floors`

Returns all floors for the given building, sorted by level number (lowest first).

**Path Parameters**

| Parameter | Type | Description |
|---|---|---|
| `buildingCode` | string | Unique building code (e.g. `MAIN`, `EAST`) |

**Response**
```json
[
  {
    "id": 1,
    "code": "G",
    "name": "Ground Floor",
    "level": 0,
    "width": 800.0,
    "height": 600.0
  },
  {
    "id": 2,
    "code": "1F",
    "name": "First Floor",
    "level": 1,
    "width": 800.0,
    "height": 600.0
  }
]
```

---

#### `GET /api/v1/floors/{floorId}/map`

Returns the full navigable map for a floor: nodes, edges, and POIs.

**Path Parameters**

| Parameter | Type | Description |
|---|---|---|
| `floorId` | integer | Floor database ID |

**Response**
```json
{
  "floor": { "id": 1, "name": "Ground Floor", "code": "G", "level": 0, "width": 800.0, "height": 600.0 },
  "nodes": [
    { "id": "node-001", "x": 100.0, "y": 200.0, "kind": "corridor" }
  ],
  "edges": [
    { "from": "node-001", "to": "node-002", "distance_m": 12.5, "is_accessible": true }
  ],
  "pois": [
    { "id": "poi-001", "name": "Pharmacy", "category": "services", "node": "node-002" }
  ]
}
```

Node `kind` values: `corridor`, `stairs`, `elevator`, `room`, `entrance`, `exit`.

---

### Routing

#### `POST /api/v1/routes`

Computes the shortest path between two nodes using the A\* algorithm.

**Request Body**

```json
{
  "startNodeId": "node-001",
  "endNodeId": "node-042"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `startNodeId` | string | Yes | External ID of the start node |
| `endNodeId` | string | Yes | External ID of the destination node |

**Response `200 OK`**

```json
{
  "node_ids": ["node-001", "node-007", "node-015", "node-042"],
  "distance_m": 87.3
}
```

**Error Responses**

| Status | Condition |
|---|---|
| `400` | `startNodeId` or `endNodeId` missing from request body |
| `404` | One or both nodes not found in the database |
| `404` | No path exists between the two nodes |

---

### Authentication

#### `POST /api/v1/auth/signup`

Register a new user with email and password.

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Jane Doe"
}
```

**Response `201 Created`**

```json
{
  "token": "<jwt>",
  "userId": 1,
  "email": "user@example.com",
  "name": "Jane Doe",
  "avatar": null
}
```

---

#### `POST /api/v1/auth/login`

Authenticate an existing user with email and password.

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response `200 OK`** — same shape as `/signup`.

---

#### `POST /api/v1/auth/google`

Exchange a Google ID token (obtained on the client via the Google Sign-In SDK) for a platform JWT. The token is verified server-side using the official `google-auth` library.

**Request Body**

```json
{ "token": "<google-id-token>" }
```

**Response `200 OK`** — same shape as `/signup`.

---

#### `GET /api/v1/auth/me`

Returns the currently authenticated user's profile. Requires `Authorization: Bearer <token>`.

**Response `200 OK`**

```json
{
  "userId": 1,
  "email": "user@example.com",
  "name": "Jane Doe",
  "avatar": "https://lh3.googleusercontent.com/..."
}
```

---

### Map Management

All map endpoints except `GET /api/v1/maps/public` require authentication.

---

#### `POST /api/v1/maps/upload`

Upload a floor plan file (PDF, PNG, or JPG, max 25 MB) for AI-powered analysis.

**Request** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | The floor plan file to upload |

**Response `201 Created`**

```json
{
  "id": 5,
  "name": "hospital_ground_floor.pdf",
  "status": "analyzing",
  "analysisJobId": "rq-job-uuid",
  "isPublic": false,
  "buildingCount": null,
  "floorCount": null,
  "uploadDate": "2025-03-26T00:00:00",
  "thumbnail": null,
  "error": null
}
```

---

#### `GET /api/v1/maps/list`

Returns all maps uploaded by the authenticated user, newest first.

**Response `200 OK`** — array of map objects (same shape as upload response).

---

#### `GET /api/v1/maps/public`

Returns all publicly visible, successfully analysed maps. Does not require authentication.

**Response `200 OK`**

```json
[
  {
    "id": 3,
    "name": "City General Hospital",
    "uploadedBy": "Admin User",
    "buildingCount": 4,
    "floorCount": 12,
    "thumbnail": null,
    "uploadDate": "2025-03-01T10:00:00"
  }
]
```

---

#### `GET /api/v1/maps/{mapId}/status`

Poll this endpoint to track analysis progress after uploading a map.

**Response `200 OK`**

```json
{
  "id": 5,
  "status": "analyzed",
  "analysisJobId": "rq-job-uuid",
  "error": null,
  "buildingCount": 2,
  "floorCount": 6
}
```

`status` values: `analyzing` → `analyzed` or `error`.

---

#### `PATCH /api/v1/maps/{mapId}/privacy`

Toggle the public/private visibility of an owned map.

**Request Body**

```json
{ "isPublic": true }
```

**Response `200 OK`** — updated map object.

---

#### `DELETE /api/v1/maps/{mapId}`

Permanently delete an owned map and its associated file from disk.

**Response `200 OK`**

```json
{ "message": "Map deleted successfully" }
```

---

## Database Schema

```
users
  id            INTEGER PK
  email         VARCHAR(128) UNIQUE NOT NULL
  password_hash VARCHAR(256)          -- NULL for OAuth-only accounts
  name          VARCHAR(128) NOT NULL
  avatar_url    VARCHAR(512)
  login_method  VARCHAR(32)           -- 'email' or 'google'
  google_id     VARCHAR(128) UNIQUE
  is_active     BOOLEAN NOT NULL
  created_at    DATETIME NOT NULL
  updated_at    DATETIME NOT NULL

buildings
  id            INTEGER PK
  code          VARCHAR(32) UNIQUE NOT NULL   -- short identifier e.g. 'MAIN'
  name          VARCHAR(128) NOT NULL
  latitude      FLOAT
  longitude     FLOAT
  created_at / updated_at

floors
  id            INTEGER PK
  building_id   INTEGER FK → buildings.id
  code          VARCHAR(32) NOT NULL          -- e.g. 'G', '1F', 'B1'
  name          VARCHAR(128) NOT NULL
  level         INTEGER NOT NULL              -- 0 = ground, negative = basement
  width         FLOAT NOT NULL               -- canvas/SVG width units
  height        FLOAT NOT NULL
  UNIQUE (building_id, code)

nodes
  id            INTEGER PK
  external_id   VARCHAR(64) UNIQUE NOT NULL  -- stable public identifier
  floor_id      INTEGER FK → floors.id
  x             FLOAT NOT NULL               -- canvas coordinate
  y             FLOAT NOT NULL
  kind          VARCHAR(32) NOT NULL         -- corridor / stairs / elevator / room / …

edges
  id            INTEGER PK
  from_node_id  INTEGER FK → nodes.id
  to_node_id    INTEGER FK → nodes.id
  distance_m    FLOAT NOT NULL               -- real-world walking distance in metres
  bidirectional BOOLEAN NOT NULL
  is_accessible BOOLEAN NOT NULL            -- false = stairs-only segment

pois  (points of interest)
  id            INTEGER PK
  external_id   VARCHAR(64) UNIQUE NOT NULL
  floor_id      INTEGER FK → floors.id
  node_id       INTEGER FK → nodes.id        -- nearest navigable node
  name          VARCHAR(128) NOT NULL        -- e.g. 'Radiology', 'Cafe'
  category      VARCHAR(64)                 -- e.g. 'medical', 'food', 'services'

uploaded_maps
  id                INTEGER PK
  user_id           INTEGER FK → users.id
  name              VARCHAR(256) NOT NULL
  original_filename VARCHAR(256) NOT NULL
  file_path         VARCHAR(512) NOT NULL
  thumbnail_path    VARCHAR(512)
  analysis_job_id   VARCHAR(64)             -- RQ job ID for status polling
  status            VARCHAR(32) NOT NULL    -- analyzing / analyzed / error
  error_message     TEXT
  is_public         BOOLEAN NOT NULL
  building_count    INTEGER
  floor_count       INTEGER
  analysis_result   JSON                    -- full AI/heuristic parse result
```

---

## Pathfinding Algorithm

The routing engine (`backend/app/services/routing.py`) implements the classic **A\*** search algorithm:

1. **Graph construction** — all `Edge` records are converted to an adjacency list. Bidirectional edges are expanded into two directed entries. When `accessible_only=True`, edges with `is_accessible=False` (e.g. staircase-only segments) are excluded.

2. **Heuristic** — straight-line (Euclidean) distance between node coordinates: `h(n) = √((n.x − goal.x)² + (n.y − goal.y)²)`. This is admissible because real corridors are always at least as long as the straight-line distance.

3. **Priority queue** — a min-heap (`heapq`) ordered by `f(n) = g(n) + h(n)`, where `g(n)` is the accumulated walking distance from the start.

4. **Path reconstruction** — a `came_from` dictionary traces the optimal predecessor of each visited node. Once the goal is reached, the path is reconstructed in reverse and the total walking distance is summed from the edge weights.

5. **Response** — the endpoint returns `node_ids` (an ordered list of `external_id` strings) and `distance_m` (rounded to two decimal places).

If no path exists between the nodes (disconnected graph or isolated node), the API returns a `404` response.

---

## AI Map Analysis Pipeline

When a file is uploaded:

1. **PyMuPDF** extracts raw text from each page of a PDF (up to the first 5 pages).
2. The text (up to 12,000 characters) is sent to **OpenAI** with a structured prompt asking the model to infer:
   - `buildingCount` — number of distinct buildings described
   - `floorCount` — total floors across all buildings
   - `confidence` — model's self-assessed confidence (0–1)
   - `buildings` — array of `{ name, floors }` objects
   - `notes` — any qualitative observations
3. The JSON response is parsed and stored in `uploaded_maps.analysis_result`.

**Fallback behaviour:**

| Condition | Engine Used | Confidence |
|---|---|---|
| `OPENAI_API_KEY` is set and call succeeds | `openai` | Model-reported (typically 0.7–0.95) |
| `OPENAI_API_KEY` is set but call fails | `fallback-after-ai-error` | 0.45 |
| `OPENAI_API_KEY` is not configured | `heuristic` | 0.40 |

The **heuristic parser** counts occurrences of keywords like `floor`, `level`, `building`, and `wing` in the extracted text to estimate counts. It is always available, making the pipeline resilient to API outages.

For image files (PNG/JPG), the pipeline currently uses the filename as fallback text. OCR integration is listed as a next step on the [roadmap](#roadmap).

---

## Authentication System

### Email / Password

- Passwords are hashed with **PBKDF2-SHA256** using 260,000 iterations and a 16-byte random salt via Werkzeug's `generate_password_hash`.
- On login, `check_password_hash` verifies the submitted password against the stored hash.
- A **JWT** is issued on successful signup or login, signed with `SECRET_KEY` using `HS256`.

### Google OAuth 2.0

- The React frontend uses the `@react-oauth/google` SDK to obtain a Google ID token in the browser.
- The token is sent to `POST /api/v1/auth/google`.
- The server verifies the token using `google.oauth2.id_token.verify_oauth2_token` (official library, cryptographic verification, no network call to Google after initial key download).
- If the token is valid and the email is verified, the user is created or updated and a platform JWT is returned.
- Multiple `GOOGLE_CLIENT_ID` values are supported (e.g. one for the web app, one for a future mobile app).

### Token Usage

Include the token as a Bearer token in all protected API calls:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Deploying to Vercel (Frontend)

The root `vercel.json` configures Vercel to build only the `frontend/` subdirectory, ignoring the Python backend, docs, and any other folders.

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo.
3. Keep the **Root Directory** as the repository root (do **not** change it to `frontend/`). Vercel reads `vercel.json` from the repo root.
4. Add the following environment variable under **Project Settings → Environment Variables**:
   - `VITE_API_BASE_URL` = `https://<your-backend-domain>/api/v1`
5. Click **Deploy**.

Every push to your default branch will trigger a new deployment. Pull request previews get unique Vercel URLs automatically.

> **SPA routing:** The `vercel.json` rewrites all paths to `/index.html` so that React Router handles client-side navigation correctly.

---

## Deploying the Backend

The backend is a standard Flask app and can be deployed to any Python hosting platform. Below is a generic guide.

### Environment Setup

1. Set all [backend environment variables](#backend-environment-variables) in your platform's secret/environment management UI.
2. Set `DATABASE_URL` to a managed PostgreSQL connection string.
3. Set `REDIS_URL` to a managed Redis instance.
4. Set `SECRET_KEY` to a long, random secret (never commit it).

### Running in Production

```bash
# Install dependencies (no dev extras needed)
pip install -r requirements.txt

# Apply migrations before starting
python scripts/migrate_db.py

# Start the API (replace with gunicorn or uvicorn in production)
gunicorn "app:create_app()" --bind 0.0.0.0:5000 --workers 4

# Start the worker (in a separate process/dyno/container)
python scripts/run_worker.py
```

### Platform-Specific Notes

| Platform | Notes |
|---|---|
| **Render** | Use a Web Service for the API and a Background Worker for RQ. Add a Redis add-on. |
| **Railway** | Deploy the backend as a service; use the Railway Redis plugin. |
| **Fly.io** | Use `fly launch` and add a Redis app. Set secrets with `fly secrets set`. |
| **Heroku** | Use the Heroku Postgres and Redis add-ons. Add a `Procfile` with `web` and `worker` process types. |

---

## Database Migrations

This project uses [Flask-Migrate](https://flask-migrate.readthedocs.io/) (backed by Alembic) for schema version control.

```bash
cd backend
source .venv/bin/activate

# Create a new migration after changing models.py
flask db migrate -m "describe your change here"

# Apply pending migrations to the database
flask db upgrade

# Or use the convenience script (runs upgrade automatically)
python scripts/migrate_db.py
```

Migration files are stored in `backend/migrations/versions/` and should be committed to version control so all environments stay in sync.

---

## Roadmap

See [`docs/PRODUCT_ROADMAP.md`](docs/PRODUCT_ROADMAP.md) for the full vision and prioritised feature list. Highlights:

### Near-Term
- [ ] **OCR for image maps** — integrate Tesseract or an OpenAI vision call to extract text from PNG/JPG floor plans.
- [ ] **Accessible-only routing** — expose the `accessible_only` parameter from the A\* engine through the API.
- [ ] **Retry and dead-letter queue** — add RQ retry policies and a dead-letter queue for failed map analysis jobs.
- [ ] **Role-based authorization** — admin and moderator roles for map review and approval.

### Medium-Term
- [ ] **AI-assisted graph generation** — use computer vision (OpenCV, YOLO/Detectron) to detect corridors, rooms, stairs, and elevators from floor plan images and auto-generate node/edge graphs.
- [ ] **CAD ingestion** — parse DXF/DWG files and convert architectural layers to navigable graphs.
- [ ] **Real-time route closures** — WebSocket events to push route-closure updates (maintenance, emergency) to active navigation sessions.
- [ ] **Live occupancy heatmaps** — density overlays from aggregated positioning data.

### Long-Term
- [ ] **Indoor positioning** — hybrid BLE beacon + Wi-Fi RTT + IMU dead reckoning with Kalman filtering for sub-3-metre accuracy without GPS.
- [ ] **Multi-tenant SaaS portal** — organisation accounts, subscription tiers, per-building dashboards.
- [ ] **White-label SDK** — embeddable JavaScript and native mobile SDKs for enterprise clients.
- [ ] **Staff dispatch** — nearest-resource finding and staff routing for healthcare workflows.

---

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a pull request. For bug fixes and small improvements, a pull request with a clear description is sufficient.

1. Fork the repository and create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes following the existing code style.
3. Test your changes locally for both the frontend and backend.
4. Open a pull request against the `main` branch with a description of what you changed and why.

---

*Built with ❤️ as a startup-ready indoor navigation platform. Detailed product roadmap and vision: [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md).*
