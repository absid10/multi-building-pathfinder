# Smart Hospital Navigation & Wayfinding System 🏥

A multi-building hospital indoor navigation system built with **React + TypeScript** (Vite + shadcn-ui), using **Leaflet.js** and **SVG-based floor maps**. An **A\*** pathfinding engine operates on graph-structured JSON data to compute accurate and accessibility-aware routes.

## 🚀 Features

- Interactive hospital floor maps rendered with Leaflet + SVG overlays
- **A\*** pathfinding over graph-based map data
- Multi-building + multi-floor navigation primitives
- Planned accessibility-aware routing (elevators, ramps, etc.)
- Planned **Flask + PostgreSQL** backend for map and route storage

## 🛠 Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn-ui, Leaflet.js
- **Algorithms & Data:** JSON graph data, A* pathfinding, heuristics
- **Backend (planned):** Flask, PostgreSQL

## 📂 Project Status & Next Steps

- [ ] Finalize data model for nodes, edges, and building metadata
- [ ] Render SVG floor maps within Leaflet tiles
- [ ] Implement A* search across graph data (accessibility toggles)
- [ ] Visualize computed paths on each floor map
- [ ] Design Flask + PostgreSQL API surface
- [ ] Add integration tests + deployment docs

> 🎓 B.Tech major project focused on scalable, extensible indoor navigation for hospitals.

## 🧑‍💻 Development Options

### Work locally (recommended)

```sh
git clone https://github.com/absid10/smart-hospital-navigation.git
cd smart-hospital-navigation/frontend
npm install
npm run dev
```

### Use Lovable (cloud IDE)

- Project URL: https://lovable.dev/projects/0f530f4e-a09e-4cc3-b58d-5f23b7c361e8
- Edits made in Lovable are committed back to this repository automatically.

### Other options

- Edit directly in GitHub (pencil icon)
- Launch GitHub Codespaces for a cloud VS Code experience

## 🚢 Deployment

- Use Lovable's **Share → Publish** to ship quick previews.
- Traditional hosting (Vercel, Netlify, etc.) can deploy the Vite build output (`npm run build`).

## 🌐 Custom Domains via Lovable

Navigate to **Project → Settings → Domains → Connect Domain** inside Lovable. Docs: https://docs.lovable.dev/features/custom-domain#custom-domain
