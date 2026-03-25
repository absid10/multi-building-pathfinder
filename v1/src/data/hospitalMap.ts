// src/data/hospitalMap.ts
import { Node, Edge, POI } from "@/utils/pathfinding";

// Define the interface for your room layouts
export interface RoomArea {
  id: string;
  nodeId: string;
  type?: "poly" | "rect";
  points?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

// ----------------------
// 🏥 Building A – Floor 1
// (Built from your new trace data)
// ----------------------
export const floor1Map = {
  id: "floor1",
  name: "Ground Floor - Building A",
  width: 700, // Based on your trace
  height: 800, // Based on your trace

  roomAreas: [
    { id: "A_ra_ortho", nodeId: "A_N_ortho", type: "poly", points: "247,387,283,412,248,466,228,508,188,485" },
    { id: "A_ra_physio", nodeId: "A_N_physio", type: "poly", points: "321,513,325,546,292,549,229,508,245,474,287,523,289,514" },
    { id: "A_ra_obgy", nodeId: "A_N_obgy", type: "poly", points: "321,423,321,514,324,548,374,554,375,414" },
    { id: "A_ra_surgery", nodeId: "A_N_surgery", type: "poly", points: "405,416,435,409,483,475,449,498" },
    { id: "A_ra_dispensory", nodeId: "A_N_dispensory", type: "poly", points: "446,392,401,391,403,297,449,292" },
    { id: "A_ra_rmo", nodeId: "A_N_rmo", type: "poly", points: "407,281,424,248,454,261,441,287" },
    { id: "A_ra_radio", nodeId: "A_N_radio", type: "poly", points: "443,213,472,231,454,262,426,249" },
    { id: "A_ra_gynac", nodeId: "A_N_gynac", type: "poly", points: "444,213,454,190,501,215,485,239" },
    { id: "A_ra_opthalmic", nodeId: "A_N_opthalmic", type: "poly", points: "382,173,372,175,371,280,342,279,337,142,383,142" },
    { id: "A_ra_ms_office", nodeId: "A_N_ms_office", type: "poly", points: "336,142,275,149,257,137,209,151,200,186,246,286,291,281,262,240,283,191,337,178" },
    { id: "A_ra_stairs1", nodeId: "N_Stairs_1", type: "poly", points: "300,281,298,257,330,257,330,280" },
    { id: "A_ra_stairs2", nodeId: "N_Stairs_2", type: "poly", points: "292,421,290,441,320,444,319,424" },
    { id: "A_ra_minor_ot", nodeId: "A_N_minor_ot", type: "poly", points: "450,537,479,535,485,593,456,597" },
    { id: "A_ra_phsycat", nodeId: "A_N_phsycat", type: "poly", points: "503,533,479,537,484,592,512,592" },
    { id: "A_ra_reg", nodeId: "A_N_reg", type: "poly", points: "252,312,252,349,273,351,272,311" },
    { id: "A_ra_main_ent", nodeId: "N_Start", type: "poly", points: "220,316,220,345,252,349,253,314" },
    { id: "A_ra_corridor", nodeId: "", type: "poly", points: "217,365,251,378,247,386,282,413,250,465,246,475,288,524,289,515,259,477,293,422,319,424,375,416,376,409,401,406,407,417,436,410,484,476,448,498,450,537,502,533,489,461,445,409,447,394,402,393,404,297,449,293,484,240,472,234,455,262,443,286,407,284,381,291,383,176,373,177,370,282,332,282,294,281,260,239,283,190,289,188,282,180,272,188,249,242,274,282,246,285,253,311,251,347,252,380" },
  ] as RoomArea[],
  
  nodes: [
    // Corridor Points (from your new 21-point trace)
    { id: "A_J_1", x: 259, y: 369 }, { id: "A_J_2", x: 280, y: 383 }, { id: "A_J_3", x: 294, y: 408 }, { id: "A_J_4", x: 307, y: 407 }, { id: "A_J_5", x: 265, y: 449 }, { id: "A_J_6", x: 252, y: 472 }, { id: "A_J_7", x: 344, y: 405 }, { id: "A_J_8", x: 388, y: 395 }, { id: "A_J_9", x: 435, y: 397 }, { id: "A_J_10", x: 460, y: 432 }, { id: "A_J_11", x: 486, y: 476 }, { id: "A_J_12", x: 472, y: 508 }, { id: "A_J_13", x: 389, y: 340 }, { id: "A_J_14", x: 388, y: 298 }, { id: "A_J_15", x: 411, y: 287 }, { id: "A_J_16", x: 443, y: 288 }, { id: "A_J_17", x: 455, y: 274 }, { id: "A_J_18", x: 467, y: 251 }, { id: "A_J_19", x: 373, y: 298 }, { id: "A_J_20", x: 375, y: 221 }, { id: "A_J_21", x: 336, y: 290 }, { id: "A_J_22", x: 313, y: 290 }, { id: "A_J_23", x: 271, y: 294 }, { id: "A_J_24", x: 291, y: 334 },
    // Main Entrance
    { id: "N_Start", x: 231, y: 331 },
    // Room Entry Nodes
    { id: "A_N_ortho", x: 252, y: 441 },
    { id: "A_N_physio", x: 294, y: 526 },
    { id: "A_N_obgy", x: 348, y: 430 },
    { id: "A_N_surgery", x: 452, y: 442 },
    { id: "A_N_dispensory", x: 409, y: 340 },
    { id: "A_N_rmo", x: 441, y: 267 },
    { id: "A_N_radio", x: 453, y: 240 },
    { id: "A_N_gynac", x: 484, y: 229 },
    { id: "A_N_opthalmic", x: 364, y: 217 },
    { id: "A_N_ms_office", x: 262, y: 271 },
    { id: "A_N_minor_ot", x: 465, y: 545 },
    { id: "A_N_phsycat", x: 492, y: 545 },
    { id: "A_N_reg", x: 268, y: 330 },
    // Stair Entry Nodes
    { id: "N_Stairs_1", x: 315, y: 274 },
    { id: "N_Stairs_2", x: 307, y: 428 },
  ] as Node[],

  edges: [
    // Corridor Spine
    { from: "N_Start", to: "A_J_24", weight: 10 }, { from: "N_Start", to: "A_J_1", weight: 10 }, { from: "A_J_1", to: "A_J_2", weight: 10 }, { from: "A_J_2", to: "A_J_3", weight: 10 }, { from: "A_J_3", to: "A_J_4", weight: 10 }, { from: "A_J_4", to: "A_J_5", weight: 10 }, { from: "A_J_5", to: "A_J_6", weight: 10 }, { from: "A_J_4", to: "A_J_7", weight: 10 }, { from: "A_J_7", to: "A_J_8", weight: 10 }, { from: "A_J_8", to: "A_J_9", weight: 10 }, { from: "A_J_9", to: "A_J_10", weight: 10 }, { from: "A_J_10", to: "A_J_11", weight: 10 }, { from: "A_J_11", to: "A_J_12", weight: 10 }, { from: "A_J_13", to: "A_J_14", weight: 10 }, { from: "A_J_14", to: "A_J_15", weight: 10 }, { from: "A_J_15", to: "A_J_16", weight: 10 }, { from: "A_J_16", to: "A_J_17", weight: 10 }, { from: "A_J_17", to: "A_J_18", weight: 10 }, { from: "A_J_14", to: "A_J_19", weight: 10 }, { from: "A_J_19", to: "A_J_20", weight: 10 }, { from: "A_J_19", to: "A_J_21", weight: 10 }, { from: "A_J_21", to: "A_J_22", weight: 10 }, { from: "A_J_22", to: "A_J_23", weight: 10 }, { from: "A_J_23", to: "A_J_24", weight: 10 }, { from: "A_J_13", to: "A_J_8", weight: 10 },

    // Room Connections
    { from: "A_J_24", to: "A_N_reg", weight: 10 },
    { from: "A_J_5", to: "A_N_ortho", weight: 10 },
    { from: "A_J_6", to: "A_N_physio", weight: 10 },
    { from: "A_J_4", to: "A_N_obgy", weight: 10 },
    { from: "A_J_10", to: "A_N_surgery", weight: 10 },
    { from: "A_J_13", to: "A_N_dispensory", weight: 10 },
    { from: "A_J_16", to: "A_N_rmo", weight: 10 },
    { from: "A_J_17", to: "A_N_radio", weight: 10 },
    { from: "A_J_18", to: "A_N_gynac", weight: 10 },
    { from: "A_J_20", to: "A_N_opthalmic", weight: 10 },
    { from: "A_J_23", to: "A_N_ms_office", weight: 10 },
    { from: "A_J_12", to: "A_N_minor_ot", weight: 10 },
    { from: "A_J_12", to: "A_N_phsycat", weight: 10 },
    
    // Stair Connections
    { from: "A_J_22", to: "N_Stairs_1", weight: 10 },
    { from: "A_J_4", to: "N_Stairs_2", weight: 10 },
  ] as Edge[],

  pois: [
    { id: "A_p_start", name: "Main Entrance", node: "N_Start", icon: "door-open" },
    { id: "A_p_reg", name: "Registration", node: "A_N_reg", icon: "archive" },
    { id: "A_p_ortho", name: "Ortho OPD", node: "A_N_ortho", icon: "bed" },
    { id: "A_p_physio", name: "Physio OPD", node: "A_N_physio", icon: "activity" },
    { id: "A_p_obgy", name: "OBGY OPD", node: "A_N_obgy", icon: "bed" },
    { id: "A_p_surgery", name: "Surgery", node: "A_N_surgery", icon: "syringe" },
    { id: "A_p_dispensory", name: "OPD Dispensory", node: "A_N_dispensory", icon: "pill" },
    { id: "A_p_rmo", name: "RMO Office", node: "A_N_rmo", icon: "info" },
    { id: "A_p_radio", name: "Radio OPD", node: "A_N_radio", icon: "info" },
    { id: "A_p_gynac", name: "Gynac OPD", node: "A_N_gynac", icon: "bed" },
    { id: "A_p_opthalmic", name: "Opthalmic OPD", node: "A_N_opthalmic", icon: "eye" },
    { id: "A_p_ms_office", name: "MS Office", node: "A_N_ms_office", icon: "archive" },
    { id: "A_p_stairs_1", name: "Stairs 1", node: "N_Stairs_1", icon: "door-open" },
    { id: "A_p_stairs_2", name: "Stairs 2", node: "N_Stairs_2", icon: "door-open" },
    { id: "A_p_minor_ot", name: "Minor OT", node: "A_N_minor_ot", icon: "syringe" },
    { id: "A_p_phsycat", name: "Phsycat (Dressing)", node: "A_N_phsycat", icon: "info" },
  ] as POI[],
};

// ----------------------
// 🏥 Building A – Floor 2
// (Built from your new F2 trace data)
// ----------------------
export const floor2Map = {
  id: "floor2",
  name: "Building A - Floor 2",
  width: 700,
  height: 800,
  roomAreas: [
    { id: "f2_ra_ortho", nodeId: "f2_N_ortho", type: "poly", points: "247,387,283,412,248,466,228,508,188,485" },
    { id: "f2_ra_physio", nodeId: "f2_N_physio", type: "poly", points: "321,513,325,546,292,549,229,508,245,474,287,523,289,514" },
    { id: "f2_ra_ent", nodeId: "f2_N_ent", type: "poly", points: "321,423,321,514,324,548,374,554,375,414" },
    { id: "f2_ra_pediatrics", nodeId: "f2_N_pediatrics", type: "poly", points: "405,416,435,409,483,476,491,466,501,534,452,537,449,494" },
    { id: "f2_ra_geriatrics", nodeId: "f2_N_geriatrics", type: "poly", points: "446,392,401,391,403,341,447,344" },
    { id: "f2_ra_med129", nodeId: "f2_N_med129", type: "poly", points: "407,281,424,248,454,261,441,287" },
    { id: "f2_ra_med130", nodeId: "f2_N_med130", type: "poly", points: "443,213,472,231,454,262,426,249" },
    { id: "f2_ra_med131", nodeId: "f2_N_med131", type: "poly", points: "444,213,454,190,501,215,485,239" },
    { id: "f2_ra_lab", nodeId: "f2_N_lab", type: "poly", points: "382,173,372,175,371,280,342,279,337,142,383,142" },
    { id: "f2_ra_immun", nodeId: "f2_N_immun", type: "poly", points: "233,142,209,151,200,186,246,286,275,282,249,241,273,188" },
    { id: "f2_ra_stairs1", nodeId: "f2_N_Stairs_1", type: "poly", points: "300,281,298,257,330,257,330,280" },
    { id: "f2_ra_stairs2", nodeId: "f2_N_Stairs_2", type: "poly", points: "292,421,290,441,320,444,319,424" },
    { id: "f2_ra_lap_lab", nodeId: "f2_N_lap_lab", type: "poly", points: "246,286,255,312,252,332,220,332,220,314,212,294" },
    { id: "f2_ra_tb_lab", nodeId: "f2_N_tb_lab", type: "poly", points: "251,333,250,377,218,370,221,334" },
    { id: "f2_ra_art", nodeId: "f2_N_art", type: "poly", points: "403,296,402,341,446,344,446,294" },
    { id: "f2_ra_skin", nodeId: "f2_N_skin", type: "poly", points: "233,142,253,135,272,147,335,141,335,176,290,188,283,179,273,188" },
    { id: "f2_ra_corridor", nodeId: "", type: "poly", points: "247,390,283,415,250,465,246,475,288,524,289,515,259,477,293,422,319,424,375,416,376,409,401,406,407,417,436,410,484,476,490,464,446,409,448,394,402,393,404,297,449,293,484,240,472,234,455,262,443,286,407,284,381,291,383,176,373,177,370,282,332,282,289,281,260,239,283,190,289,188,282,180,272,188,249,242,274,282,246,285,253,311,251,347,252,380" },
  ] as RoomArea[],
  
  nodes: [
    // Corridor Points (from your new 23-point trace)
    { id: "f2_J_1", x: 263, y: 353 }, { id: "f2_J_2", x: 275, y: 386 }, { id: "f2_J_3", x: 294, y: 408 }, { id: "f2_J_4", x: 310, y: 412 }, { id: "f2_J_5", x: 265, y: 449 }, { id: "f2_J_6", x: 252, y: 474 }, { id: "f2_J_7", x: 346, y: 405 }, { id: "f2_J_8", x: 388, y: 395 }, { id: "f2_J_9", x: 431, y: 400 }, { id: "f2_J_10", x: 460, y: 432 }, { id: "f2_J_11", x: 389, y: 340 }, { id: "f2_J_12", x: 388, y: 298 }, { id: "f2_J_13", x: 411, y: 287 }, { id: "f2_J_14", x: 443, y: 288 }, { id: "f2_J_15", x: 455, y: 274 }, { id: "f2_J_16", x: 467, y: 251 }, { id: "f2_J_17", x: 373, y: 298 }, { id: "f2_J_18", x: 378, y: 224 }, { id: "f2_J_19", x: 336, y: 290 }, { id: "f2_J_20", x: 313, y: 290 }, { id: "f2_J_21", x: 286, y: 291 }, { id: "f2_J_22", x: 266, y: 312 }, { id: "f2_J_23", x: 255, y: 239 }, { id: "f2_J_24", x: 278, y: 188 }, { id: "f2_J_25", x: 269, y: 496 },

    // Room Entry Nodes
    { id: "f2_N_ortho", x: 252, y: 441 },
    { id: "f2_N_physio", x: 294, y: 526 },
    { id: "f2_N_ent", x: 348, y: 430 },
    { id: "f2_N_pediatrics", x: 452, y: 442 },
    { id: "f2_N_geriatrics", x: 411, y: 367 },
    { id: "f2_N_med129", x: 441, y: 267 },
    { id: "f2_N_med130", x: 453, y: 240 },
    { id: "f2_N_med131", x: 484, y: 229 },
    { id: "f2_N_lab", x: 364, y: 217 },
    { id: "f2_N_immun", x: 249, y: 224 },
    { id: "f2_N_lap_lab", x: 244, y: 298 },
    { id: "f2_N_tb_lab", x: 246, y: 355 },
    { id: "f2_N_art", x: 411, y: 317 },
    { id: "f2_N_skin", x: 298, y: 173 },
    
    // Stair Entry Nodes
    { id: "f2_N_Stairs_1", x: 315, y: 274 },
    { id: "f2_N_Stairs_2", x: 307, y: 428 },
  ] as Node[],

  edges: [
    // Corridor Spine
    { from: "f2_J_1", to: "f2_J_2", weight: 10 }, { from: "f2_J_2", to: "f2_J_3", weight: 10 }, { from: "f2_J_3", to: "f2_J_4", weight: 10 }, { from: "f2_J_3", to: "f2_J_5", weight: 10 }, { from: "f2_J_5", to: "f2_J_6", weight: 10 }, { from: "f2_J_6", to: "f2_J_25", weight: 10 }, { from: "f2_J_4", to: "f2_J_7", weight: 10 }, { from: "f2_J_7", to: "f2_J_8", weight: 10 }, { from: "f2_J_8", to: "f2_J_9", weight: 10 }, { from: "f2_J_9", to: "f2_J_10", weight: 10 }, { from: "f2_J_8", to: "f2_J_11", weight: 10 }, { from: "f2_J_11", to: "f2_J_12", weight: 10 }, { from: "f2_J_12", to: "f2_J_13", weight: 10 }, { from: "f2_J_13", to: "f2_J_14", weight: 10 }, { from: "f2_J_14", to: "f2_J_15", weight: 10 }, { from: "f2_J_15", to: "f2_J_16", weight: 10 }, { from: "f2_J_12", to: "f2_J_17", weight: 10 }, { from: "f2_J_17", to: "f2_J_18", weight: 10 }, { from: "f2_J_17", to: "f2_J_19", weight: 10 }, { from: "f2_J_19", to: "f2_J_20", weight: 10 }, { from: "f2_J_20", to: "f2_J_21", weight: 10 }, { from: "f2_J_21", to: "f2_J_22", weight: 10 }, { from: "f2_J_22", to: "f2_J_1", weight: 10 }, { from: "f2_J_21", to: "f2_J_23", weight: 10 }, { from: "f2_J_23", to: "f2_J_24", weight: 10 },

    // Room Connections
    { from: "f2_J_5", to: "f2_N_ortho", weight: 10 },
    { from: "f2_J_25", to: "f2_N_physio", weight: 10 },
    { from: "f2_J_7", to: "f2_N_ent", weight: 10 },
    { from: "f2_J_10", to: "f2_N_pediatrics", weight: 10 },
    { from: "f2_J_11", to: "f2_N_geriatrics", weight: 10 },
    { from: "f2_J_15", to: "f2_N_med129", weight: 10 },
    { from: "f2_J_16", to: "f2_N_med130", weight: 10 },
    { from: "f2_J_16", to: "f2_N_med131", weight: 10 },
    { from: "f2_J_18", to: "f2_N_lab", weight: 10 },
    { from: "f2_J_23", to: "f2_N_immun", weight: 10 },
    { from: "f2_J_22", to: "f2_N_lap_lab", weight: 10 },
    { from: "f2_J_1", to: "f2_N_tb_lab", weight: 10 },
    { from: "f2_J_12", to: "f2_N_art", weight: 10 },
    { from: "f2_J_24", to: "f2_N_skin", weight: 10 },
    
    // Stair Connections
    { from: "f2_J_20", to: "f2_N_Stairs_1", weight: 10 },
    { from: "f2_J_4", to: "f2_N_Stairs_2", weight: 10 },
  ] as Edge[],

  pois: [
    { id: "f2_p_ortho", name: "Ortho OPD", node: "f2_N_ortho", icon: "bed" },
    { id: "f2_p_physio", name: "Physiotherapy OPD", node: "f2_N_physio", icon: "activity" },
    { id: "f2_p_ent", name: "ENT OPD", node: "f2_N_ent", icon: "bed" },
    { id: "f2_p_pediatrics", name: "Pediatrics", node: "f2_N_pediatrics", icon: "bed" },
    { id: "f2_p_geriatrics", name: "Geriatrics", node: "f2_N_geriatrics", icon: "info" },
    { id: "f2_p_med129", name: "Medicine 129", node: "f2_N_med129", icon: "bed" },
    { id: "f2_p_med130", name: "Medicine 130", node: "f2_N_med130", icon: "bed" },
    { id: "f2_p_med131", name: "Medicine 131", node: "f2_N_med131", icon: "bed" },
    { id: "f2_p_lab", name: "Laboratory OPD", node: "f2_N_lab", icon: "droplet" },
    { id: "f2_p_immun", name: "Immunization", node: "f2_N_immun", icon: "syringe" },
    { id: "f2_p_lap_lab", name: "Laparoscopy Lab", node: "f2_N_lap_lab", icon: "droplet" },
    { id: "f2_p_tb_lab", name: "TB Lab", node: "f2_N_tb_lab", icon: "droplet" },
    { id: "f2_p_art", name: "ART Center", node: "f2_N_art", icon: "heart-pulse" },
    { id: "f2_p_skin", name: "Skin", node: "f2_N_skin", icon: "info" },
    { id: "f2_p_stairs_1", name: "Stairs 1 (to F1)", node: "f2_N_Stairs_1", icon: "door-open" },
    { id: "f2_p_stairs_2", name: "Stairs 2 (to F1)", node: "f2_N_Stairs_2", icon: "door-open" },
  ] as POI[],
};


// ----------------------
// All Floors
// ----------------------
export const floorMaps = {
  floor1: floor1Map,
  floor2: floor2Map,
};