# Backend Service

Flask + PostgreSQL API foundation for Smart Hospital Navigation.

## Included in this version
- Flask app factory with environment-driven config.
- SQLAlchemy models for buildings, floors, nodes, edges, and POIs.
- CORS enabled API blueprint under /api/v1.
- A* route computation service for server-side path requests.
- JWT auth with email/password and Google sign-in.
- Upload and map analysis pipeline with Redis + RQ async jobs.
- AI-assisted map parsing with OpenAI and deterministic fallback parser.

## Quick Start

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python scripts\migrate_db.py
python run.py
```

The service starts on http://localhost:5000.

## Run API + Worker

Open 2 terminals (same virtual environment active):

```powershell
# terminal 1 - API
cd backend
.venv\Scripts\activate
python run.py
```

```powershell
# terminal 2 - background map analysis worker
cd backend
.venv\Scripts\activate
python scripts\run_worker.py
```

## Environment Variables

Set these in `.env`:

- `DATABASE_URL` (use your Neon connection string)
- `SECRET_KEY`
- `TOKEN_EXPIRY`
- `GOOGLE_CLIENT_ID` (comma-separated if multiple client IDs)
- `REDIS_URL`
- `UPLOAD_FOLDER`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## Neon Setup (Render Backend)

1. In Neon, open **Connect** and copy the pooled PostgreSQL connection string.
2. In Render backend service, set `DATABASE_URL` to that Neon value.
3. Redeploy the backend service.
4. Run schema upgrade once:

```powershell
cd backend
.venv\Scripts\activate
python scripts\migrate_db.py
```

The migration script applies the existing Alembic head (`flask db upgrade`) for safe deploy-time setup.

### Verify Backend Is Using Neon

- Check Render logs for successful startup without DB errors.
- Hit `GET /api/v1/health`.
- In Neon SQL Editor, verify tables and row growth after app actions.

## API Endpoints
- GET /api/v1/health
- GET /api/v1/buildings
- GET /api/v1/buildings/{buildingCode}/floors
- GET /api/v1/floors/{floorId}/map
- POST /api/v1/routes
- POST /api/v1/auth/signup
- POST /api/v1/auth/login
- POST /api/v1/auth/google
- GET /api/v1/auth/me
- POST /api/v1/maps/upload
- GET /api/v1/maps/list
- GET /api/v1/maps/public
- GET /api/v1/maps/{mapId}/status
- PATCH /api/v1/maps/{mapId}/privacy
- DELETE /api/v1/maps/{mapId}

## Next Backend Steps
1. Add OCR for image-based map files.
2. Add retries and dead-letter queue policy for failed map analysis jobs.
3. Add role-based authorization for map moderation.
4. Add map ingestion pipeline for CAD to graph conversion.
