const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

// Guard against accidentally pasted quoted values in hosting env vars.
const normalizedBase = rawBase?.replace(/^['"]+|['"]+$/g, "").trim();

const withApiPrefix = (value: string): string => {
  const trimmed = value.replace(/\/$/, "");
  if (trimmed.endsWith("/api/v1")) return trimmed;
  return `${trimmed}/api/v1`;
};

export const API_BASE = (normalizedBase && normalizedBase.length > 0
  ? withApiPrefix(normalizedBase)
  : "https://multi-building-pathfinder.onrender.com/api/v1").replace(/\/$/, "");
