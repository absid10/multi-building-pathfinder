# Product Roadmap: Indoor Navigation as a Service

## Vision
Build a startup-ready indoor navigation platform where hospitals, airports, malls, and campuses can upload architectural layouts and instantly get searchable, routable, live-tracked indoor maps.

## New Features Implemented in This Iteration
- Flask + PostgreSQL backend scaffold with route and map APIs.
- Interactive frontend navigation summary with live tracking simulation.
- Turn-by-turn style instruction generation (left/right/arrive guidance).
- ETA and walking distance analytics in feet and minutes.

## High-Impact Features to Add Next
1. AI map ingestion
- Upload CAD, PDF, or image floor plans.
- Detect corridors, rooms, stairs, elevators using CV models.
- Auto-generate graph nodes and edges.

2. Indoor positioning
- Hybrid BLE beacons + Wi-Fi RTT + IMU dead reckoning.
- Kalman filtering for smoother location updates.
- Position confidence score and route re-centering.

3. Live operations layer
- Real-time crowding heatmaps.
- Route closures for maintenance/emergencies.
- Staff dispatch and nearest-resource finding.

4. Product and business layer
- Multi-tenant SaaS admin portal.
- Subscription tiers by number of buildings/floors.
- API-first white-label SDK for enterprise clients.

## Recommended Architecture for Scale
- Frontend: React + TypeScript + MapLibre GL or deck.gl overlays.
- Backend API: Flask or FastAPI with PostgreSQL + PostGIS.
- Realtime: WebSocket gateway (Socket.IO or NATS).
- AI pipeline: Python services using OpenCV + Detectron/YOLO + OCR.
- Worker queue: Celery or RQ for map processing jobs.
- Infra: Docker + Kubernetes + managed PostgreSQL.

## Resume-Friendly Language Stack Suggestions
- Keep Python for AI and backend APIs (great for interview depth and speed).
- Keep TypeScript for frontend and shared contracts.
- Add one strongly typed backend language for impact:
  - Go: excellent for realtime and high-throughput APIs.
  - Java (Spring Boot): enterprise credibility for hospital IT deployments.
  - Rust (optional): differentiator for high-performance routing core.

## Suggested Product Pitch
IndoorMapX helps hospitals and large facilities deliver accurate indoor guidance with live navigation, reducing patient confusion, late arrivals, and staff wayfinding overhead.
