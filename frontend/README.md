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

App runs on Vite dev server (usually `http://localhost:5173`).

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
