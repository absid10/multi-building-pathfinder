// @ts-nocheck
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mapRegistry } from "../src/data/buildingMaps";

type AnyRecord = Record<string, any>;

const floorLevel = (floorKey: string): number => {
  if (floorKey === "floor1") return 1;
  if (floorKey === "floor2") return 2;
  if (floorKey === "floor3") return 3;
  return 1;
};

const normalizeFloor = (floorKey: string, floorData: AnyRecord) => ({
  code: floorKey,
  name: floorData.name || floorKey,
  level: floorLevel(floorKey),
  width: Number(floorData.width || 0),
  height: Number(floorData.height || 0),
  nodes: Array.isArray(floorData.nodes) ? floorData.nodes : [],
  edges: Array.isArray(floorData.edges) ? floorData.edges : [],
  pois: Array.isArray(floorData.pois) ? floorData.pois : [],
});

const normalizeBuilding = (buildingKey: string, buildingData: AnyRecord) => {
  const floorsObj = (buildingData.floors || {}) as AnyRecord;
  const floorEntries = Object.entries(floorsObj)
    .filter(([floorKey]) => ["floor1", "floor2", "floor3"].includes(floorKey))
    .map(([floorKey, floorData]) => normalizeFloor(floorKey, floorData as AnyRecord))
    .sort((a, b) => a.level - b.level);

  return {
    key: buildingKey,
    name: buildingData.name || buildingKey,
    floors: floorEntries,
  };
};

const payload = {
  generatedAt: new Date().toISOString(),
  maps: Object.entries(mapRegistry).map(([mapId, mapData]) => {
    const buildingsObj = ((mapData as AnyRecord).buildings || {}) as AnyRecord;
    const included = ["buildingA", "buildingB"];
    const buildings = included
      .filter((key) => Boolean(buildingsObj[key]))
      .map((key) => normalizeBuilding(key, buildingsObj[key]));

    return {
      mapId,
      mapName: (mapData as AnyRecord).name || mapId,
      buildings,
    };
  }),
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(currentDir, "../../backend/data/seed/map_registry.seed.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf-8");

console.log(`Map seed exported to: ${outPath}`);
console.log(`Maps exported: ${payload.maps.length}`);
