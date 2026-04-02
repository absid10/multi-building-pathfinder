# Multi-Building Hospital Pathfinder

A robust indoor navigation platform for complex hospital campuses, designed to compute and visualize optimal routes across **multiple buildings** and **multiple floors** using **A\*** pathfinding, **React + TypeScript**, **Leaflet.js**, and **SVG floor maps**.

---

## ✨ Key Highlights

- 🏥 **Multi-Building Navigation**  
  Supports route transitions across connected hospital buildings.

- 🧭 **Indoor Pathfinding with A\***  
  Computes efficient shortest paths between selected start and destination points.

- 🗺️ **Interactive Map Experience**  
  Uses Leaflet for zooming, panning, markers, and route overlays.

- 🧱 **Floor-Aware Routing**  
  Handles stairs, elevators, ramps, and floor-to-floor transitions.

- 📍 **SVG-Based Indoor Maps**  
  Scalable and precise rendering of building layouts and navigation paths.

- ✅ **Type-Safe Frontend Architecture**  
  Built with TypeScript for maintainability and safer refactoring.

---

## 📌 Table of Contents

- [Project Overview](#project-overview)
- [Live Deployment](#-live-deployment)
- [Feature Set](#feature-set)
- [Technology Stack](#technology-stack)
- [System Workflow](#system-workflow)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Pathfinding Model](#pathfinding-model)
- [Configuration](#configuration)
- [Testing](#testing)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

Navigating large hospitals can be challenging due to:

- Multiple interconnected buildings
- Complex floor layouts
- Different vertical connectors (stairs/elevators/ramps)
- Restricted or one-way areas

This project addresses these challenges by modeling indoor spaces as a weighted graph and rendering computed routes directly on interactive maps.

---

## 🌐 Live Deployment

- **Frontend (Vercel):** https://multi-building-pathfinder.vercel.app/
- **Backend API (Render):** https://multi-building-pathfinder.onrender.com
- **Database:** **Render PostgreSQL** (`multi-building-pathfinder-db`)
- **Backend Runtime:** Python 3
- **Database Region:** Ohio (Render)

> Note: Render free instances may take a few seconds to wake up after inactivity.

---

## Feature Set

### 1) Multi-Building + Multi-Floor Routing
- Supports point-to-point navigation even when source and destination are in different buildings/floors.

### 2) Interactive Indoor Map UI
- Zoom and pan controls
- Route polyline overlays
- Start/end marker placement

### 3) Graph-Driven Navigation Engine
- Hallways/intersections represented as nodes
- Traversable links represented as weighted edges
- Cross-floor and cross-building connectors included in graph

### 4) Extensible Data Model
- Easy addition of new buildings/floors by updating map assets and graph definitions.

---

## Technology Stack

### Frontend
- **React**
- **TypeScript**
- **Leaflet.js**

### Mapping & Visualization
- **SVG floor plans** for indoor layouts
- Custom overlay logic for route display

### Data / Utility Layer
- **Python scripts** (optional) for graph preprocessing or data transformation

---

## System Workflow

1. **Load Map + Graph Data**  
   SVG assets and navigation graph metadata are loaded for selected buildings/floors.

2. **Select Route Points**  
   User selects source and destination.

3. **Compute Route**  
   A\* algorithm evaluates graph costs and returns the optimal path.

4. **Render Route**  
   Path is drawn on the map, including transitions across floors/buildings.

5. **Display Navigation Context**  
   UI can indicate floor switches and connector types (stairs/elevator/etc.).

---

## Project Structure

```text
multi-building-pathfinder/
├── public/
│   ├── maps/                  # SVG maps and static visual assets
│   └── ...
├── src/
│   ├── components/            # Reusable UI + map components
│   ├── pages/                 # Application pages/views
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # A* and helper utilities
│   ├── data/                  # Building/floor graph definitions
│   ├── types/                 # TypeScript interfaces/types
│   ├── styles/                # Styling files
│   ├── App.tsx
│   └── main.tsx (or index.tsx)
├── scripts/                   # Python helpers/utilities (if any)
├── tests/                     # Test suites
├── package.json
└── README.md
```

> Update paths if your actual repository layout differs.

---

## Installation & Setup

### Prerequisites

- **Node.js** 18+ recommended  
- **npm** (or yarn/pnpm)

### Clone and Install

```bash
git clone https://github.com/absid10/multi-building-pathfinder.git
cd multi-building-pathfinder
npm install
```

---

## Running the Application

### Development

```bash
npm run dev
```

If your project is CRA-based:

```bash
npm start
```

### Production Build

```bash
npm run build
```

### Preview Build (if Vite)

```bash
npm run preview
```

---

## Pathfinding Model

The routing engine uses **A\*** with:

- **g(n)** = accumulated path cost from start
- **h(n)** = estimated remaining distance (heuristic)
- **f(n) = g(n) + h(n)**

### Graph Components
- **Nodes**: intersections, room connectors, transition points
- **Edges**: walkable links with weights (distance/time/restrictions)
- **Special Links**: stairs/elevators for vertical transitions, connectors for building transitions

---

## Configuration

Recommended configurable modules:

- Building/floor metadata
- Node/edge graph definitions
- Edge weights and constraints
- Default map center/zoom
- Route styling (color, thickness, animation)

Keep these in structured files (e.g., `src/data` / `src/config`) for maintainability.

---

## Testing

Suggested testing coverage:

- ✅ Path correctness (shortest-path validation)
- ✅ No-path scenarios
- ✅ Cross-floor/building transition logic
- ✅ UI route rendering and marker behavior
- ✅ Graph consistency checks (missing nodes/broken links)

Run tests:

```bash
npm run test
```

---

## Future Improvements

- ♿ Accessibility-first routing (elevator-priority/wheelchair-safe paths)
- 🚧 Temporary closure-aware routing
- 🗣️ Voice-assisted navigation
- 📋 Turn-by-turn text instructions
- 🔍 Department/room search integration
- 🛠️ Internal admin tool for map + graph editing

---

## Contributing

Contributions are welcome! 🚀

1. Fork the repository
2. Create a feature branch
3. Commit your changes clearly
4. Open a pull request

Please ensure:
- Code style consistency
- Tests are added/updated where needed
- Changes are focused and documented

---

## License

Add your preferred license in a `LICENSE` file and reference it here.

Example:

```text
This project is licensed under the MIT License — see the LICENSE file for details.
```

If you have not selected a license yet, update this section once finalized.
