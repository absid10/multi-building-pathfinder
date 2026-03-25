// src/data/buildingMaps.ts
import { floor1Map, floor2Map } from "./hospitalMap";
import { floor1MapB, floor2MapB, floor3MapB } from "./hospitalMapB";
import { campusMapData } from "./campusMapData"; // ✅ --- IMPORT THE NEW CAMPUS MAP

/**
 * 🔹 Main Building Map Registry
 */
export const buildingMaps = {
  // ✅ --- ADD CAMPUS MAP
  campus: {
    name: "Main Campus",
    floors: {
      "floor1": campusMapData, // Campus only has one "floor"
    }
  },
  buildingA: {
    name: "OPD",
    floors: {
      floor1: floor1Map,
      floor2: floor2Map,
    },
  },
  buildingB: {
    name: "Casualty",
    floors: {
      floor1: floor1MapB,
      floor2: floor2MapB,
      floor3: floor3MapB,
    },
  },
};

/**
 * 🏗️ Inter-building edges
 * ✅ --- CONNECT CAMPUS ENTRANCES TO BUILDING ENTRANCES --- ✅
 */
export const interBuildingEdges = [
  // Connect OPD (Building A)
  { from: "N_Start", to: "CAMPUS_OPD_ENTRANCE", weight: 1 },
  { from: "CAMPUS_OPD_ENTRANCE", to: "N_Start", weight: 1 },
  
  // Connect Casualty (Building B)
  { from: "B_J_1", to: "CAMPUS_CASUALTY_ENTRANCE", weight: 1 },
  { from: "CAMPUS_CASUALTY_ENTRANCE", to: "B_J_1", weight: 1 },
];

/**
 * 🧭 Inter-floor edges for Building A
 * (Unchanged)
 */
export const interFloorEdgesA = [
  { from: "N_Stairs_1", to: "f2_N_Stairs_1", weight: 30 },
  { from: "f2_N_Stairs_1", to: "N_Stairs_1", weight: 30 },
  { from: "N_Stairs_2", to: "f2_N_Stairs_2", weight: 30 },
  { from: "f2_N_Stairs_2", to: "N_Stairs_2", weight: 30 },
];

/**
 * 🧭 Inter-floor edges for Building B (F1 ↔ F2)
 * (Unchanged)
 */
export const interFloorEdgesB_F1_F2 = [
  { from: "B_N_Stairs_1", to: "B_f2_N_Stairs_1", weight: 30 },
  { from: "B_f2_N_Stairs_1", to: "B_N_Stairs_1", weight: 30 },
  { from: "B_N_Stairs_2", to: "B_f2_N_Stairs_2", weight: 30 },
  { from: "B_f2_N_Stairs_2", to: "B_N_Stairs_2", weight: 30 },
];

/**
 * 🧭 Inter-floor edges for Building B (F2 ↔ F3)
 * (Unchanged)
 */
export const interFloorEdgesB_F2_F3 = [
  { from: "B_f2_N_Stairs_1", to: "B_f3_N_Stairs_1", weight: 30 },
  { from: "B_f3_N_Stairs_1", to: "B_f2_N_Stairs_1", weight: 30 },
  { from: "B_f2_N_Stairs_2", to: "B_f3_N_Stairs_2", weight: 30 },
  { from: "B_f3_N_Stairs_2", to: "B_f2_N_Stairs_2", weight: 30 },
];


/**
 * 🌐 Combine all cross-floor and cross-building edges
 */
export const globalEdges = [
  ...interBuildingEdges,
  ...interFloorEdgesA,
  ...interFloorEdgesB_F1_F2,
  ...interFloorEdgesB_F2_F3,
];