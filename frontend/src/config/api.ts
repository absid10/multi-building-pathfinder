const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

// Guard against accidentally pasted quoted values in hosting env vars.
const normalizedBase = rawBase?.replace(/^['"]+|['"]+$/g, "").trim();

export const API_BASE = (normalizedBase && normalizedBase.length > 0
  ? normalizedBase
  : "https://multi-building-pathfinder.onrender.com/api/v1").replace(/\/$/, "");
