# Software Requirements Specification (SRS)

## Project Title
Smart Hospital Navigation and Multi-Building Indoor Wayfinding Platform

## Version
1.0

## Date
2026-03-26

## 1. Introduction

### 1.1 Purpose
This document defines the functional and non-functional requirements of the Smart Hospital Navigation platform. The system provides indoor navigation for complex campuses (hospitals, colleges, multi-building institutions) and includes map upload, analysis, management, and exploration workflows.

### 1.2 Scope
The platform enables:
- Public and private map access control.
- Indoor route calculation over graph-based floor plans.
- Multi-building and multi-floor navigation.
- Uploading architectural maps and converting them into navigable graph data.
- AI-assisted and heuristic parsing for maps.
- Local training catalog and retraining support for map layout priors.

### 1.3 Definitions
- POI: Point of Interest (room/service destination).
- Node: Coordinate point in floor graph.
- Edge: Connects two nodes with weight/distance.
- Uploaded Map: User-provided floorplan file analyzed into graph structure.
- Training Catalog: Collection of map files used to refine layout priors.

### 1.4 Stakeholders
- Project Owner / Admin
- End Users (visitors, patients, students, staff)
- Developers and maintainers

## 2. Overall Description

### 2.1 Product Perspective
The product is a web platform composed of:
- Frontend SPA for user interactions and visualization.
- Backend REST API for auth, map processing, and data management.
- Optional async worker for map analysis jobs.

### 2.2 User Classes
- Guest user: Can browse public maps.
- Authenticated user: Can upload, rename, set privacy, delete, and explore own maps.
- Admin (future): Moderation and governance roles.

### 2.3 Operating Environment
- Browser-based frontend (desktop/mobile responsive).
- Backend on Python/Flask with SQLAlchemy.
- Optional Redis + RQ for background processing.

### 2.4 Assumptions
- Uploaded files are valid PNG/JPG/PDF up to configured size.
- For best analysis quality, map files include textual/structural cues.
- Queue infrastructure may be unavailable in local mode; inline fallback is supported.

## 3. Functional Requirements

### 3.1 Authentication and Session
- FR-1: System shall support email/password signup and login.
- FR-2: System shall support Google login (when configured).
- FR-3: System shall use token-based authentication for protected map actions.

### 3.2 Map Upload and Analysis
- FR-4: Authenticated users shall upload map files (PNG/JPG/PDF).
- FR-5: System shall validate file type and size.
- FR-6: System shall create map records with analyzing status after upload.
- FR-7: System shall queue map analysis when async worker is available.
- FR-8: System shall fallback to inline analysis if queue enqueue fails.
- FR-9: System shall expose analysis status endpoint for polling.

### 3.3 Uploaded Map Management
- FR-10: Authenticated users shall list their uploaded maps.
- FR-11: Authenticated users shall rename uploaded maps.
- FR-12: Authenticated users shall toggle privacy (private/public) for analyzed maps.
- FR-13: Authenticated users shall delete their uploaded maps.
- FR-14: System shall expose public analyzed maps for discovery.

### 3.4 Navigation
- FR-15: System shall compute shortest path using A* over graph nodes/edges.
- FR-16: User shall select destination POI and current location.
- FR-17: System shall show generated route on visual map.
- FR-18: System shall support seeded map navigation routes.
- FR-19: System shall support uploaded-map exploration route based on analyzed graph.

### 3.5 Training and Model Priors
- FR-20: System shall maintain training catalog of map files.
- FR-21: System shall retrain lightweight layout model from cataloged maps.
- FR-22: System shall expose training overview and retrain endpoints.
- FR-23: Uploaded files shall be ingestible into training catalog.

### 3.6 Informational Pages
- FR-24: System shall include About page with owner/project identity.
- FR-25: System shall include Future Enhancements page with roadmap.
- FR-26: System shall include Contact page with email/GitHub/LinkedIn.
- FR-27: System shall include support contact action.

## 4. External Interface Requirements

### 4.1 User Interface
- Dashboard with Public Maps and Your Maps tabs.
- Uploaded map cards with actions: Explore, Rename, Public/Private, Delete.
- Training panel showing map count, model metadata, and retrain action.
- Dedicated uploaded map navigator page.

### 4.2 API Interfaces
- /api/v1/health
- /api/v1/auth/*
- /api/v1/maps/upload
- /api/v1/maps/list
- /api/v1/maps/public
- /api/v1/maps/{id}
- /api/v1/maps/{id}/status
- /api/v1/maps/{id}/privacy
- /api/v1/maps/{id}/name
- /api/v1/maps/{id} (DELETE)
- /api/v1/maps/training
- /api/v1/maps/training/retrain
- /api/v1/routes

### 4.3 Data Storage
- Relational DB tables for users, uploaded maps, navigation entities.
- JSON analysis result persisted per uploaded map.
- Local training files:
  - backend/data/training/catalog.json
  - backend/data/training/layout_model.json

## 5. Non-Functional Requirements

### 5.1 Performance
- NFR-1: Health endpoint should respond within 1 second under normal local load.
- NFR-2: UI list and status updates should remain responsive while polling.
- NFR-3: Fallback analysis should complete without queue dependency in dev setups.

### 5.2 Reliability
- NFR-4: Upload pipeline must not hard-fail solely due to queue unavailability.
- NFR-5: System must preserve uploaded map records and status transitions.

### 5.3 Security
- NFR-6: Protected map operations require valid auth token.
- NFR-7: Only map owners can rename/delete/toggle privacy for their maps.
- NFR-8: Non-owners can access uploaded map details only if map is public and analyzed.

### 5.4 Usability
- NFR-9: Key actions (Explore, Rename, Privacy, Delete) must be visible on uploaded map cards.
- NFR-10: Navigation page shall provide clear controls for location and destination selection.

### 5.5 Maintainability
- NFR-11: Configuration values shall be environment-driven.
- NFR-12: Core docs shall be maintained in README and SRS for onboarding.

## 6. Constraints
- Python and Node runtime compatibility as defined by dependency files.
- OpenAI-assisted parsing depends on API key availability.
- Redis worker availability may vary by deployment target.

## 7. Future Enhancements (Planned)
- AR-assisted navigation overlays.
- Improved OCR and CAD/BIM ingestion.
- Indoor positioning with BLE/Wi-Fi fusion.
- Accessibility-first routing profiles.
- Heatmap analytics and occupancy-aware dynamic rerouting.
- Role-based moderation and enterprise multi-tenant controls.

## 8. Acceptance Criteria
- AC-1: User can upload map and see status progress.
- AC-2: User can rename uploaded map successfully.
- AC-3: User can toggle map visibility between private/public.
- AC-4: User can click Explore and reach navigation view for uploaded map.
- AC-5: Public maps are discoverable in public tab.
- AC-6: Training panel displays catalog + model stats and supports retrain.
- AC-7: About/Future/Contact/Support pages are accessible via navigation and footer links.

## 9. Document Control
Owner: Abdullah Ahmed Siddiqui
Repository: multi-building-pathfinder

