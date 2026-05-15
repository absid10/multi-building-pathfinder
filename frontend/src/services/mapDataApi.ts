import { API_BASE } from "@/config/api";
import { getMapBuildings } from "@/data/buildingMaps";

type BackendBuilding = {
  id: number;
  code: string;
  name: string;
};

type BackendFloor = {
  id: number;
  code: string;
  name: string;
  level: number;
  width: number;
  height: number;
};

type BackendFloorMap = {
  floor: {
    id: number;
    code: string;
    name: string;
    level: number;
    width: number;
    height: number;
  };
  nodes: Array<{ id: string; x: number; y: number; kind?: string }>;
  edges: Array<{ from: string; to: string; distance_m?: number; weight?: number }>;
  pois: Array<{ id: string; name: string; node: string; category?: string }>;
};

type FrontendFloor = {
  id: string;
  name: string;
  width: number;
  height: number;
  roomAreas: any[];
  nodes: Array<{ id: string; x: number; y: number }>;
  edges: Array<{ from: string; to: string; weight: number }>;
  pois: Array<{ id: string; name: string; node: string; icon?: string }>;
};

export type FrontendBuildings = Record<
  "buildingA" | "buildingB",
  {
    name: string;
    floors: Record<string, FrontendFloor>;
  }
>;

const fallbackFor = (mapId: string): FrontendBuildings =>
  getMapBuildings(mapId) as FrontendBuildings;

const levelToFloorKey = (level: number, index: number): "floor1" | "floor2" | "floor3" => {
  if (level <= 1) return "floor1";
  if (level === 2) return "floor2";
  if (level >= 3) return "floor3";
  return (["floor1", "floor2", "floor3"][Math.max(0, Math.min(index, 2))] as
    | "floor1"
    | "floor2"
    | "floor3");
};

const mapCategoryToIcon = (value?: string): string => {
  const category = (value || "").toLowerCase();
  if (category.includes("stairs")) return "door-open";
  if (category.includes("entrance")) return "door-open";
  if (category.includes("pharmacy")) return "pill";
  if (category.includes("lab")) return "droplet";
  if (category.includes("ward")) return "bed";
  if (category.includes("surgery")) return "syringe";
  return "info";
};

const looksLikeGeca = (building: BackendBuilding) => {
  const combined = `${building.code} ${building.name}`.toLowerCase();
  return (
    combined.includes("geca") ||
    combined.includes("engineering") ||
    combined.includes("civil") ||
    combined.includes("admin")
  );
};

const pickMapBuildings = (mapId: string, buildings: BackendBuilding[]): BackendBuilding[] => {
  const wantsGeca = mapId.toLowerCase().includes("geca");
  const filtered = buildings.filter((b) => (wantsGeca ? looksLikeGeca(b) : !looksLikeGeca(b)));
  if (filtered.length >= 2) return filtered.slice(0, 2);
  if (buildings.length >= 2) return buildings.slice(0, 2);
  return filtered;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
};

export const loadMapBuildingsFromBackend = async (mapId: string): Promise<FrontendBuildings> => {
  try {
    const allBuildings = await fetchJson<BackendBuilding[]>(`${API_BASE}/buildings`);
    const selectedBuildings = pickMapBuildings(mapId, allBuildings);

    if (selectedBuildings.length < 2) {
      return fallbackFor(mapId);
    }

    const result: Partial<FrontendBuildings> = {};

    for (let bIndex = 0; bIndex < 2; bIndex += 1) {
      const backendBuilding = selectedBuildings[bIndex];
      const buildingKey = (bIndex === 0 ? "buildingA" : "buildingB") as "buildingA" | "buildingB";

      const floors = await fetchJson<BackendFloor[]>(
        `${API_BASE}/buildings/${backendBuilding.code}/floors`
      );
      const sortedFloors = [...floors].sort((a, b) => a.level - b.level).slice(0, 3);
      if (sortedFloors.length === 0) {
        return fallbackFor(mapId);
      }

      const mappedFloors: Record<string, FrontendFloor> = {};
      for (let i = 0; i < sortedFloors.length; i += 1) {
        const floor = sortedFloors[i];
        const floorKey = levelToFloorKey(floor.level, i);
        const floorMap = await fetchJson<BackendFloorMap>(`${API_BASE}/floors/${floor.id}/map`);
        mappedFloors[floorKey] = {
          id: floorKey,
          name: floor.name || floorMap.floor.name || floorKey,
          width: floorMap.floor.width || floor.width || 1000,
          height: floorMap.floor.height || floor.height || 1000,
          roomAreas: [],
          nodes: floorMap.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
          edges: floorMap.edges.map((e) => ({
            from: e.from,
            to: e.to,
            weight: e.weight ?? e.distance_m ?? 1,
          })),
          pois: floorMap.pois.map((p) => ({
            id: p.id,
            name: p.name,
            node: p.node,
            icon: mapCategoryToIcon(p.category),
          })),
        };
      }

      result[buildingKey] = {
        name: backendBuilding.name,
        floors: mappedFloors,
      };
    }

    if (!result.buildingA || !result.buildingB) {
      return fallbackFor(mapId);
    }

    return result as FrontendBuildings;
  } catch (_error) {
    return fallbackFor(mapId);
  }
};
