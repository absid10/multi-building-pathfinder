# Major Project Report

**Project Title:** Smart Hospital Navigation and Multi-Building Indoor Wayfinding Platform  
**Repository:** multi-building-pathfinder  
**Prepared By:** Abdullah Ahmed Siddiqui  
**Program:** B.Tech Computer Science and Engineering (Batch 2026)  
**Date:** 2026-05-15  

---

## Abstract
Navigating large indoor environments such as hospitals and multi-building campuses is difficult due to complex floor layouts, multiple connected buildings, and user unfamiliarity. This project delivers a full-stack indoor wayfinding platform that models floor plans as weighted graphs and computes shortest paths using the A* algorithm. The solution includes a web-based user interface for map exploration and route visualization, a backend API for authentication and map services, and deployment on modern cloud infrastructure. The system supports multi-building and multi-floor routing, public/private map access, and map upload/analysis workflows.

---

## 1. Introduction
Large public buildings often lack effective indoor navigation support, leading to delays and confusion. This project addresses that gap by creating a software platform for indoor navigation across multiple buildings and floors. The platform models indoor spaces as graph structures and provides optimal routes between points of interest (POIs). The system is designed to be extensible for future AI-assisted map parsing and advanced navigation features.

---

## 2. Problem Statement
Hospitals and campus-style environments are difficult to navigate because of:
- Multiple connected buildings
- Multi-floor transitions (stairs, elevators, ramps)
- Complex corridors and intersections
- Lack of clear indoor guidance for visitors

The project aims to create a web-based wayfinding system that provides accurate indoor routes and intuitive map visualization.

---

## 3. Objectives
- Design a graph-based model for indoor spaces
- Implement A* shortest path routing
- Build a responsive web interface for route visualization
- Provide secure authentication and map management
- Support map upload and analysis for user-provided layouts
- Deploy the system using modern cloud services

---

## 4. Scope
### In Scope
- Multi-building and multi-floor navigation
- Public and private map access
- User authentication (email/password, Google)
- Map upload and analysis workflow
- REST API for routing and map services

### Out of Scope (Current Version)
- Real-time indoor positioning
- AR navigation overlays
- Dynamic rerouting based on crowd data

---

## 5. System Overview
The platform is a full-stack web system with three main components:
1. **Frontend SPA** (React + TypeScript) for map rendering and user interaction
2. **Backend API** (Flask + PostgreSQL) for authentication, routing, and data storage
3. **Optional Worker** (Redis + RQ) for asynchronous map analysis

---

## 6. Architecture
### 6.1 High-Level Architecture
- Frontend communicates with backend REST endpoints under `/api/v1`
- Backend persists data in PostgreSQL (Neon)
- Optional background worker handles map analysis jobs
- Routing engine computes paths using graph nodes and edges

### 6.2 Technology Stack
**Frontend**
- React 18, TypeScript, Vite
- Tailwind CSS + shadcn/ui

**Backend**
- Python 3, Flask
- SQLAlchemy, Flask-Migrate
- JWT authentication

**Database & Deployment**
- Neon PostgreSQL
- Render (Backend)
- Vercel (Frontend)

---

## 7. Functional Requirements (Summary)
- User authentication and session management
- Map upload with validation and analysis
- Public/private map visibility controls
- Route computation between locations
- Display of computed path on interactive map

---

## 8. System Design
### 8.1 Data Model
Key entities:
- **User**
- **Building**
- **Floor**
- **Node** (intersection/room access)
- **Edge** (walkable connections)
- **POI** (destination point)
- **Uploaded Map** (user-submitted floorplan)

### 8.2 Routing Model
- Nodes represent coordinates in indoor map
- Edges store weighted distances between nodes
- A* algorithm computes shortest path:
  - `f(n) = g(n) + h(n)`

---

## 9. Implementation Details
### 9.1 Frontend
- Interactive SVG-based map rendering
- Route overlay visualization
- Authentication-aware workflows
- Map upload UI with status tracking

### 9.2 Backend
- REST API under `/api/v1`
- Auth endpoints for signup/login
- Map upload and analysis pipeline
- Route computation service

---

## 10. Deployment
- **Frontend:** Vercel hosting
- **Backend:** Render Web Service
- **Database:** Neon PostgreSQL

---

## 11. Results
- Successfully implemented multi-building indoor routing
- Functional map upload and analysis pipeline
- Deployed full-stack system with public access

---

## 12. Testing
- Manual API endpoint verification
- Route correctness validation on sample maps
- UI validation across navigation workflows

---

## 13. Future Enhancements
- AR-assisted indoor navigation
- OCR/CAD-based map ingestion
- Accessibility-first routing profiles
- Real-time indoor positioning support

---

## 14. Conclusion
The Multi-Building Indoor Wayfinder System provides a practical solution for indoor navigation across complex environments. By combining graph-based routing, a modern UI, and scalable backend infrastructure, the project demonstrates a complete end-to-end system suitable for real-world deployment. The architecture supports future enhancements such as AI-based parsing and dynamic navigation features.

---

## 15. References
- Project repository documentation (README, SRS)
- A* pathfinding algorithm literature
