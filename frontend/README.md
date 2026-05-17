# Multi-Building Indoor Wayfinder

Frontend application for indoor hospital navigation across multiple buildings and floors.
The app renders SVG map layers, runs route discovery, and integrates with the backend API for auth, map upload, and navigation workflows.

## Live App

- Frontend (Vercel): https://multi-building-pathfinder.vercel.app/
- Backend API (Render): https://multi-building-pathfinder.onrender.com
- API base path used by frontend: `/api/v1`

## Core Features

- Multi-building and multi-floor indoor wayfinding UI
- Interactive map view with routing overlays
- Start/destination selection and navigation brief generation
- Authentication-aware flows (email and Google)
- Public and uploaded map navigation support
 
New editor & analysis features (recent)
- Experimental Auto-detect: client-side image-based room detection for uploaded floorplans. Marked experimental — results vary and manual fixes are supported.
- Manual Map Editor: place nodes (rooms), stairs, entrances; draw paths; create POIs and rename them inline. Use Import/Export (JSON) to move graphs between tools.
- Room overlays (dashed polygons) to visualise auto-detected room boundaries — toggled from the editor toolbar.
- OSM footprint overlay and area-selection for campus building reference.
- 3D Preview & GLB export: preview uploaded map graphs in 3D and export a `.glb` file for external viewers.

## Tech Stack

- React 18 + TypeScript
- Vite
- React Router
- Tailwind CSS + shadcn/ui components
- Leaflet-based map rendering
- Custom pathfinding and navigation utilities

## Project Structure

```text
frontend/
├── public/
│   ├── maps/
│   └── site.webmanifest
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── contexts/
│   ├── config/
│   ├── data/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
└── index.html
```

## Environment Variables

Create `frontend/.env` (or configure in Vercel):

```env
VITE_API_BASE_URL=https://multi-building-pathfinder.onrender.com/api/v1
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Notes:

- `VITE_API_BASE_URL` can be a root URL or `/api/v1`; the app normalizes to `/api/v1`.
- If unset, the app falls back to the default production backend URL.

## Local Development

```bash
cd frontend
npm install
npm run dev
```

App runs on Vite dev server (the port may vary; run `npm run dev` and check the console — commonly `http://localhost:5173` or `http://localhost:8080`).

Editor quick notes
- Explore an analyzed uploaded map from the Dashboard by clicking **Explore Graph** on a map card.
- In the Map Editor use the top-right toolbar to switch tools (Select, Path, Room, Stairs, Entrance, Delete), toggle room overlays, run Auto-detect (experimental), or export/import the current floor graph.
- Use the 3D Preview button in the editor to open a 3D visualiser and export a GLB via the `Export GLB` button.

Dependencies
- The 3D preview uses `three` (three.js) and its GLTF exporter. Ensure `npm install` completes to get this dependency.

Known issues & troubleshooting
- Auto-detect is experimental: results may be incomplete or noisy. Use the manual Map Editor tools to correct nodes/edges and POIs.
- If you see a blank white page when opening an uploaded map, open browser DevTools → Console to capture the first error. The app includes an Error Boundary which will show an error panel with details when an uncaught render exception occurs.
- If the 3D preview fails to render, ensure `three` is installed and the uploaded map contains at least one building with floors and nodes.

## Build and Preview

```bash
cd frontend
npm run build
npm run preview
```

## Deployment (Vercel)

- Framework: Vite
- Build command: `cd frontend && npm run build`
- Output directory: `frontend/dist`

Set these Vercel environment variables:

- `VITE_API_BASE_URL`
- `VITE_GOOGLE_CLIENT_ID`

## Link Preview Metadata

Social preview tags are defined in `frontend/index.html`.
Current branding uses:

- Title: `Multi-Building Indoor Wayfinder System`
- Description: `Multi-Building Indoor Wayfinder System`

If previews look stale after deploy, share with a cache-busting query once, for example:

`https://multi-building-pathfinder.vercel.app/?v=2`
