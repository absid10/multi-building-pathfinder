const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

export const API_BASE = (base && base.length > 0
  ? base
  : "http://localhost:5000/api/v1").replace(/\/$/, "");
