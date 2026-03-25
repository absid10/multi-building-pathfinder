// src/data/hospitalMapB.ts
import { Node, Edge } from "@/utils/pathfinding";

// ----------------------
// 🏥 Building B – Floor 1 (Hospital Layout)
// (This is the file from our last step - it's already perfect)
// ----------------------
export const floor1MapB = {
  id: "floor1",
  name: "Ground Floor - Building B (Hospital Layout)",
  width: 1200,
  height: 600,
  roomAreas: [
    {
      id: "B_ra_op_15",
      nodeId: "B_N_op_15",
      type: "poly",
      points: "927,114,976,114,975,286,924,286",
    },
    {
      id: "B_ra_op_16",
      nodeId: "B_N_op_16",
      type: "poly",
      points: "924,301,922,452,911,457,910,475,981,478,980,458,974,457,972,302",
    },
    {
      id: "B_ra_ent",
      nodeId: "B_N_ent",
      type: "poly",
      points: "879,298,878,411,820,411,820,300",
    },
    {
      id: "B_ra_linen",
      nodeId: "B_N_linen",
      type: "poly",
      points: "816,279,817,103,882,106,882,282",
    },
    {
      id: "B_ra_stairs_2",
      nodeId: "B_N_Stairs_2",
      type: "poly",
      points: "762,280,763,252,794,250,794,279",
    },
    {
      id: "B_ra_ortho",
      nodeId: "B_N_ortho",
      type: "poly",
      points: "685,277,689,135,739,140,734,278",
    },
    {
      id: "B_ra_gynac",
      nodeId: "B_N_gynac",
      type: "poly",
      points: "683,294,733,291,730,442,681,442",
    },
    {
      id: "B_ra_ot1",
      nodeId: "B_N_ot1",
      type: "poly",
      points: "541,275,539,185,515,183,514,119,671,120,670,174,609,178,605,278",
    },
    {
      id: "B_ra_closed",
      nodeId: "B_N_closed",
      type: "poly",
      points: "544,289,601,291,599,443,544,443",
    },
    {
      id: "B_ra_stairs_1",
      nodeId: "B_N_Stairs_1",
      type: "poly",
      points: "480,273,480,250,519,253,520,274",
    },
    {
      id: "B_ra_xray",
      nodeId: "B_N_xray",
      type: "poly",
      points: "409,276,411,137,440,138,440,114,479,109,480,135,466,134,465,276",
    },
    {
      id: "B_ra_radio",
      nodeId: "B_N_radio",
      type: "poly",
      points: "410,289,407,435,462,440,463,291",
    },
    {
      id: "B_ra_cas_1",
      nodeId: "B_N_cas_1",
      type: "poly",
      points: "235,241,238,274,330,276,331,242",
    },
    {
      id: "B_ra_cas_2",
      nodeId: "B_N_cas_2",
      type: "poly",
      points: "242,323,236,291,327,289,327,322",
    },
    {
      id: "B_ra_blood_bank",
      nodeId: "B_N_blood_bank",
      type: "poly",
      points: "215,305,234,291,242,322,238,352,259,352,257,382,256,401,229,402,229,379,213,372",
    },
    {
      id: "B_ra_med_cas",
      nodeId: "B_N_med_cas",
      type: "poly",
      points: "216,260,238,272,239,210,259,209,307,207,307,183,235,180,235,190,219,190",
    },
    {
      id: "B_ra_corridor",
      nodeId: "",
      type: "poly",
      points: "206,261,236,271,331,274,410,275,465,275,543,273,625,276,684,277,734,277,795,278,881,280,923,286,973,287,970,300,878,295,791,295,683,292,544,287,408,286,326,287,235,289,206,300",
    },
  ],
  nodes: [
    { id: "B_J_1", x: 215, y: 278 }, // Entrance
    { id: "B_J_2", x: 282, y: 282 },
    { id: "B_J_3", x: 433, y: 281 },
    { id: "B_J_4", x: 498, y: 281 },
    { id: "B_J_5", x: 568, y: 281 },
    { id: "B_J_6", x: 705, y: 281 },
    { id: "B_J_7", x: 777, y: 286 },
    { id: "B_J_8", x: 846, y: 285 },
    { id: "B_J_9", x: 947, y: 292 },
    { id: "B_N_med_cas", x: 228, y: 251 },
    { id: "B_N_blood_bank", x: 228, y: 314 },
    { id: "B_N_cas_1", x: 280, y: 262 },
    { id: "B_N_cas_2", x: 280, y: 299 },
    { id: "B_N_xray", x: 430, y: 247 },
    { id: "B_N_radio", x: 432, y: 301 },
    { id: "B_N_Stairs_1", x: 495, y: 263 },
    { id: "B_N_ot1", x: 572, y: 245 },
    { id: "B_N_closed", x: 570, y: 335 },
    { id: "B_N_ortho", x: 714, y: 230 },
    { id: "B_N_gynac", x: 705, y: 371 },
    { id: "B_N_Stairs_2", x: 775, y: 263 },
    { id: "B_N_linen", x: 848, y: 247 },
    { id: "B_N_ent", x: 842, y: 345 },
    { id: "B_N_op_15", x: 948, y: 273 },
    { id: "B_N_op_16", x: 948, y: 328 },
  ],
  edges: [
    { from: "B_J_1", to: "B_J_2", weight: 10 },
    { from: "B_J_2", to: "B_J_3", weight: 10 },
    { from: "B_J_3", to: "B_J_4", weight: 10 },
    { from: "B_J_4", to: "B_J_5", weight: 10 },
    { from: "B_J_5", to: "B_J_6", weight: 10 },
    { from: "B_J_6", to: "B_J_7", weight: 10 },
    { from: "B_J_7", to: "B_J_8", weight: 10 },
    { from: "B_J_8", to: "B_J_9", weight: 10 },
    { from: "B_J_1", to: "B_N_med_cas", weight: 10 },
    { from: "B_J_1", to: "B_N_blood_bank", weight: 10 },
    { from: "B_J_2", to: "B_N_cas_1", weight: 10 },
    { from: "B_J_2", to: "B_N_cas_2", weight: 10 },
    { from: "B_J_3", to: "B_N_xray", weight: 10 },
    { from: "B_J_3", to: "B_N_radio", weight: 10 },
    { from: "B_J_4", to: "B_N_Stairs_1", weight: 10 },
    { from: "B_J_5", to: "B_N_ot1", weight: 10 },
    { from: "B_J_5", to: "B_N_closed", weight: 10 },
    { from: "B_J_6", to: "B_N_ortho", weight: 10 },
    { from: "B_J_6", to: "B_N_gynac", weight: 10 },
    { from: "B_J_7", to: "B_N_Stairs_2", weight: 10 },
    { from: "B_J_8", to: "B_N_linen", weight: 10 },
    { from: "B_J_8", to: "B_N_ent", weight: 10 },
    { from: "B_J_9", to: "B_N_op_15", weight: 10 },
    { from: "B_J_9", to: "B_N_op_16", weight: 10 },
  ],
  pois: [
    { id: "B_p_entrance", name: "Main Entrance", node: "B_J_1", icon: "door-open" },
    { id: "B_p_med_cas", name: "Medicine Casualty", node: "B_N_med_cas", icon: "activity" },
    { id: "B_p_blood_bank", name: "Blood Bank", node: "B_N_blood_bank", icon: "droplet" },
    { id: "B_p_cas_2", name: "Casualty 2", node: "B_N_cas_2", icon: "heart-pulse" },
    { id: "B_p_cas_1", name: "Casualty 1", node: "B_N_cas_1", icon: "heart-pulse" },
    { id: "B_p_xray", name: "X-ray Room", node: "B_N_xray", icon: "info" },
    { id: "B_p_radio", name: "Radiology", node: "B_N_radio", icon: "info" },
    { id: "B_p_stairs_1", name: "Change Floor 1", node: "B_N_Stairs_1", icon: "door-open" },
    { id: "B_p_ot1", name: "Operation Theatre 1", node: "B_N_ot1", icon: "syringe" },
    { id: "B_p_closed", name: "Maintenance", node: "B_N_closed", icon: "hammer" },
    { id: "B_p_ortho", name: "Ortho Ward 12", node: "B_N_ortho", icon: "bed" },
    { id: "B_p_gynac", name: "Gynac Ward 13", node: "B_N_gynac", icon: "bed" },
    { id: "B_p_stairs_2", name: "Change Floor 2", node: "B_N_Stairs_2", icon: "door-open" },
    { id: "B_p_linen", name: "Linen Department", node: "B_N_linen", icon: "archive" },
    { id: "B_p_ent", name: "ENT Ward 14", node: "B_N_ent", icon: "bed" },
    { id: "B_p_op_15", name: "Opthalm 15", node: "B_N_op_15", icon: "eye" },
    { id: "B_p_op_16", name: "Opthalm 16", node: "B_N_op_16", icon: "eye" },
  ],
};

// ----------------------------------------------------
// 🏥 Building B – Floor 2 (✅ --- REBUILT WITH NEW DATA --- ✅)
// ----------------------------------------------------
export const floor2MapB = {
  id: "floor2",
  name: "Building B - Floor 2",
  width: 1200, // Matched to your new trace
  height: 600, // Matched to your new trace

  // ✅ --- Your new F2 polygon rooms --- ✅
  // Note: I added the "outer boundary" to hospitalmap.tsx
  roomAreas: [
    {
      id: "B_f2_ra_burn",
      nodeId: "B_f2_N_burn",
      type: "poly",
      points: "927,114,976,114,975,286,924,286",
    },
    {
      id: "B_f2_ra_obgy",
      nodeId: "B_f2_N_obgy",
      type: "poly",
      points: "924,301,922,452,911,457,910,475,981,478,980,458,974,457,972,302",
    },
    {
      id: "B_f2_ra_anes",
      nodeId: "B_f2_N_anes",
      type: "poly",
      points: "879,298,878,411,820,411,820,300",
    },
    {
      id: "B_f2_ra_food",
      nodeId: "B_f2_N_food",
      type: "poly",
      points: "816,279,817,103,882,106,882,282",
    },
    {
      id: "B_f2_ra_stairs_2",
      nodeId: "B_f2_N_Stairs_2",
      type: "poly",
      points: "762,280,763,252,794,250,794,279",
    },
    {
      id: "B_f2_ra_surgF_L", // surgical female+kids
      nodeId: "B_f2_N_surgF_L",
      type: "poly",
      points: "685,277,689,135,739,140,734,278",
    },
    {
      id: "B_f2_ra_surgF_R", // surgical female+kids
      nodeId: "B_f2_N_surgF_R",
      type: "poly",
      points: "683,294,733,291,730,442,681,442",
    },
    {
      id: "B_f2_ra_ot3",
      nodeId: "B_f2_N_ot3",
      type: "poly",
      points: "541,275,539,185,515,183,514,119,671,120,670,174,609,178,605,278",
    },
    {
      id: "B_f2_ra_surgM19", // surgical ward 19
      nodeId: "B_f2_N_surgM19",
      type: "poly",
      points: "544,289,601,291,599,443,544,443",
    },
    {
      id: "B_f2_ra_stairs_1",
      nodeId: "B_f2_N_Stairs_1",
      type: "poly",
      points: "480,273,480,250,519,253,520,274",
    },
    {
      id: "B_f2_ra_surg17",
      nodeId: "B_f2_N_surg17",
      type: "poly",
      points: "409,276,411,137,440,138,440,114,479,109,480,135,466,134,465,276",
    },
    {
      id: "B_f2_ra_surg18",
      nodeId: "B_f2_N_surg18",
      type: "poly",
      points: "410,289,407,435,462,440,463,291",
    },
    {
      id: "B_f2_ra_nursingL", // nursing home(1-3)
      nodeId: "B_f2_N_nursingL",
      type: "poly",
      points: "235,241,238,274,330,276,331,242",
    },
    {
      id: "B_f2_ra_nursingR", // nursing home(4-6)
      nodeId: "B_f2_N_nursingR",
      type: "poly",
      points: "242,323,236,291,327,289,327,322",
    },
    {
      id: "B_f2_ra_corridor",
      nodeId: "",
      type: "poly",
      points: "206,261,236,271,331,274,410,275,465,275,543,273,625,276,684,277,734,277,795,278,881,280,923,286,973,287,970,300,878,295,791,295,683,292,544,287,408,286,326,287,235,289,206,300",
    },
  ],

  // ✅ --- Your new F2 node coordinates --- ✅
  nodes: [
    // Corridor spine (from 'cooridoor line')
    // We start at J_2 because J_1 (Entrance) is gone
    { id: "B_f2_J_2", x: 282, y: 282 },
    { id: "B_f2_J_3", x: 433, y: 281 },
    { id: "B_f2_J_4", x: 498, y: 281 },
    { id: "B_f2_J_5", x: 568, y: 281 },
    { id: "B_f2_J_6", x: 705, y: 281 },
    { id: "B_f2_J_7", x: 777, y: 286 },
    { id: "B_f2_J_8", x: 846, y: 285 },
    { id: "B_f2_J_9", x: 947, y: 292 },

    // Room nodes (from your '... entry' points)
    // Renamed to match the F2 plan
    { id: "B_f2_N_nursingL", x: 280, y: 262 }, // F1: cas_1
    { id: "B_f2_N_nursingR", x: 280, y: 299 }, // F1: cas_2
    { id: "B_f2_N_surg17", x: 430, y: 247 },   // F1: xray
    { id: "B_f2_N_surg18", x: 432, y: 301 },   // F1: radio
    { id: "B_f2_N_Stairs_1", x: 495, y: 263 }, // F1: Stairs_1
    { id: "B_f2_N_ot3", x: 572, y: 245 },      // F1: ot1
    { id: "B_f2_N_surgM19", x: 570, y: 335 },  // F1: closed
    { id: "B_f2_N_surgF_L", x: 714, y: 230 },  // F1: ortho
    { id: "B_f2_N_surgF_R", x: 705, y: 371 },  // F1: gynac
    { id: "B_f2_N_Stairs_2", x: 775, y: 263 }, // F1: Stairs_2
    { id: "B_f2_N_food", x: 848, y: 247 },     // F1: linen
    { id: "B_f2_N_anes", x: 842, y: 345 },     // F1: ent
    { id: "B_f2_N_burn", x: 948, y: 273 },     // F1: op_15
    { id: "B_f2_N_obgy", x: 948, y: 328 },     // F1: op_16
  ],

  // ✅ --- Your new F2 edges (Path) --- ✅
  edges: [
    // Corridor spine (starts from J_2)
    { from: "B_f2_J_2", to: "B_f2_J_3", weight: 10 },
    { from: "B_f2_J_3", to: "B_f2_J_4", weight: 10 },
    { from: "B_f2_J_4", to: "B_f2_J_5", weight: 10 },
    { from: "B_f2_J_5", to: "B_f2_J_6", weight: 10 },
    { from: "B_f2_J_6", to: "B_f2_J_7", weight: 10 },
    { from: "B_f2_J_7", to: "B_f2_J_8", weight: 10 },
    { from: "B_f2_J_8", to: "B_f2_J_9", weight: 10 },

    // Room branches (connected to nearest junction)
    { from: "B_f2_J_2", to: "B_f2_N_nursingL", weight: 10 },
    { from: "B_f2_J_2", to: "B_f2_N_nursingR", weight: 10 },
    { from: "B_f2_J_3", to: "B_f2_N_surg17", weight: 10 },
    { from: "B_f2_J_3", to: "B_f2_N_surg18", weight: 10 },
    { from: "B_f2_J_4", to: "B_f2_N_Stairs_1", weight: 10 },
    { from: "B_f2_J_5", to: "B_f2_N_ot3", weight: 10 },
    { from: "B_f2_J_5", to: "B_f2_N_surgM19", weight: 10 },
    { from: "B_f2_J_6", to: "B_f2_N_surgF_L", weight: 10 },
    { from: "B_f2_J_6", to: "B_f2_N_surgF_R", weight: 10 },
    { from: "B_f2_J_7", to: "B_f2_N_Stairs_2", weight: 10 },
    { from: "B_f2_J_8", to: "B_f2_N_food", weight: 10 },
    { from: "B_f2_J_8", to: "B_f2_N_anes", weight: 10 },
    { from: "B_f2_J_9", to: "B_f2_N_burn", weight: 10 },
    { from: "B_f2_J_9", to: "B_f2_N_obgy", weight: 10 },
  ],

  // ✅ --- Your new F2 POIs --- ✅
  pois: [
    // Renamed to match the F2 plan
    { id: "B_f2_p_nursingL", name: "Nursing Home (1-3)", node: "B_f2_N_nursingL", icon: "info" },
    { id: "B_f2_p_nursingR", name: "Nursing Home (4-6)", node: "B_f2_N_nursingR", icon: "info" },
    { id: "B_f2_p_surg17", name: "Surgical Ward 17", node: "B_f2_N_surg17", icon: "bed" },
    { id: "B_f2_p_surg18", name: "Surgical Ward 18", node: "B_f2_N_surg18", icon: "bed" },
    { id: "B_f2_p_stairs_1", name: "Change Floor 1", node: "B_f2_N_Stairs_1", icon: "door-open" },
    { id: "B_f2_p_ot3", name: "Operation Theatre 3", node: "B_f2_N_ot3", icon: "syringe" },
    { id: "B_f2_p_surgM19", name: "Surgical Ward 19", node: "B_f2_N_surgM19", icon: "bed" },
    { id: "B_f2_p_surgF_L", name: "Surgical Female (Kids)", node: "B_f2_N_surgF_L", icon: "bed" },
    { id: "B_f2_p_surgF_R", name: "Surgical Female (Kids)", node: "B_f2_N_surgF_R", icon: "bed" },
    { id: "B_f2_p_stairs_2", name: "Change Floor 2", node: "B_f2_N_Stairs_2", icon: "door-open" },
    { id: "B_f2_p_food", name: "Food", node: "B_f2_N_food", icon: "archive" }, // Used 'archive' as 'utensils' isn't in your icon list
    { id: "B_f2_p_anes", name: "Anesthesia ICU", node: "B_f2_N_anes", icon: "heart-pulse" },
    { id: "B_f2_p_burn", name: "Burn Ward", node: "B_f2_N_burn", icon: "bed" },
    { id: "B_f2_p_obgy", name: "OBGY Department", node: "B_f2_N_obgy", icon: "bed" },
  ],
};

export const floor3MapB = {
  id: "floor3",
  name: "Building B - Floor 3",
  width: 1200, // Matched to your new trace
  height: 600, // Matched to your new trace

  // ✅ --- Your new F3 polygon rooms --- ✅
  roomAreas: [
    { id: "B_f3_ra_fam_welfare", nodeId: "B_f3_N_fam_welfare", type: "poly", points: "927,114,976,114,975,286,924,286" },
    { id: "B_f3_ra_obgy_30", nodeId: "B_f3_N_obgy_30", type: "poly", points: "924,301,922,452,911,457,910,475,981,478,980,458,974,457,972,302" },
    { id: "B_f3_ra_ot_gynac", nodeId: "B_f3_N_ot_gynac", type: "poly", points: "879,298,878,411,820,411,820,300" },
    { id: "B_f3_ra_med_store", nodeId: "B_f3_N_med_store", type: "poly", points: "816,279,817,103,882,106,882,282" },
    { id: "B_f3_ra_stairs_2", nodeId: "B_f3_N_Stairs_2", type: "poly", points: "762,280,763,252,794,250,794,279" },
    { id: "B_f3_ra_obgy_28", nodeId: "B_f3_N_obgy_28", type: "poly", points: "685,277,689,135,739,140,734,278" },
    { id: "B_f3_ra_obgy_29", nodeId: "B_f3_N_obgy_29", type: "poly", points: "683,294,733,291,730,442,681,442" },
    { id: "B_f3_ra_labour", nodeId: "B_f3_N_labour", type: "poly", points: "541,275,539,185,515,183,514,119,671,120,670,174,609,178,605,278" },
    { id: "B_f3_ra_ped_icu", nodeId: "B_f3_N_ped_icu", type: "poly", points: "544,289,601,291,599,443,544,443" },
    { id: "B_f3_ra_stairs_1", nodeId: "B_f3_N_Stairs_1", type: "poly", points: "480,273,480,250,519,253,520,274" },
    { id: "B_f3_ra_ped_25", nodeId: "B_f3_N_ped_25", type: "poly", points: "409,276,411,137,440,138,440,114,479,109,480,135,466,134,465,276" },
    { id: "B_f3_ra_ped_24", nodeId: "B_f3_N_ped_24", type: "poly", points: "410,289,407,435,462,440,463,291" },
    { id: "B_f3_ra_newnet_1", nodeId: "B_f3_N_newnet_1", type: "poly", points: "235,241,238,274,330,276,331,242" },
    { id: "B_f3_ra_newnet_2", nodeId: "B_f3_N_newnet_2", type: "poly", points: "242,323,236,291,327,289,327,322" },
    { id: "B_f3_ra_corridor", nodeId: "", type: "poly", points: "206,261,236,271,331,274,410,275,465,275,543,273,625,276,684,277,734,277,795,278,881,280,923,286,973,287,970,300,878,295,791,295,683,292,544,287,408,286,326,287,235,289,206,300" },
  ],

  // ✅ --- Your new F3 node coordinates (prefixed with B_f3_) --- ✅
  nodes: [
    // Corridor spine (from 'cooridoor line')
    { id: "B_f3_J_2", x: 282, y: 282 }, { id: "B_f3_J_3", x: 433, y: 281 }, { id: "B_f3_J_4", x: 498, y: 281 }, { id: "B_f3_J_5", x: 568, y: 281 }, { id: "B_f3_J_6", x: 705, y: 281 }, { id: "B_f3_J_7", x: 777, y: 286 }, { id: "B_f3_J_8", x: 846, y: 285 }, { id: "B_f3_J_9", x: 947, y: 292 },
    // Room nodes (from your '... entry' points)
    { id: "B_f3_N_newnet_1", x: 280, y: 262 },
    { id: "B_f3_N_newnet_2", x: 280, y: 299 },
    { id: "B_f3_N_ped_25", x: 430, y: 247 },
    { id: "B_f3_N_ped_24", x: 432, y: 301 },
    { id: "B_f3_N_Stairs_1", x: 495, y: 263 },
    { id: "B_f3_N_labour", x: 572, y: 245 },
    { id: "B_f3_N_ped_icu", x: 570, y: 335 },
    { id: "B_f3_N_obgy_28", x: 714, y: 230 },
    { id: "B_f3_N_obgy_29", x: 705, y: 371 },
    { id: "B_f3_N_Stairs_2", x: 775, y: 263 },
    { id: "B_f3_N_med_store", x: 848, y: 247 },
    { id: "B_f3_N_ot_gynac", x: 842, y: 345 },
    { id: "B_f3_N_fam_welfare", x: 948, y: 273 },
    { id: "B_f3_N_obgy_30", x: 948, y: 328 },
  ],

  // ✅ --- Your new F3 edges (Path) --- ✅
  edges: [
    // Corridor spine (starts from J_2)
    { from: "B_f3_J_2", to: "B_f3_J_3", weight: 10 }, { from: "B_f3_J_3", to: "B_f3_J_4", weight: 10 }, { from: "B_f3_J_4", to: "B_f3_J_5", weight: 10 }, { from: "B_f3_J_5", to: "B_f3_J_6", weight: 10 }, { from: "B_f3_J_6", to: "B_f3_J_7", weight: 10 }, { from: "B_f3_J_7", to: "B_f3_J_8", weight: 10 }, { from: "B_f3_J_8", to: "B_f3_J_9", weight: 10 },
    // Room branches (connected to nearest junction)
    { from: "B_f3_J_2", to: "B_f3_N_newnet_1", weight: 10 },
    { from: "B_f3_J_2", to: "B_f3_N_newnet_2", weight: 10 },
    { from: "B_f3_J_3", to: "B_f3_N_ped_25", weight: 10 },
    { from: "B_f3_J_3", to: "B_f3_N_ped_24", weight: 10 },
    { from: "B_f3_J_4", to: "B_f3_N_Stairs_1", weight: 10 },
    { from: "B_f3_J_5", to: "B_f3_N_labour", weight: 10 },
    { from: "B_f3_J_5", to: "B_f3_N_ped_icu", weight: 10 },
    { from: "B_f3_J_6", to: "B_f3_N_obgy_28", weight: 10 },
    { from: "B_f3_J_6", to: "B_f3_N_obgy_29", weight: 10 },
    { from: "B_f3_J_7", to: "B_f3_N_Stairs_2", weight: 10 },
    { from: "B_f3_J_8", to: "B_f3_N_med_store", weight: 10 },
    { from: "B_f3_J_8", to: "B_f3_N_ot_gynac", weight: 10 },
    { from: "B_f3_J_9", to: "B_f3_N_fam_welfare", weight: 10 },
    { from: "B_f3_J_9", to: "B_f3_N_obgy_30", weight: 10 },
  ],

  // ✅ --- Your new F3 POIs --- ✅
  pois: [
    { id: "B_f3_p_newnet_1", name: "Newnet Dept (1-3)", node: "B_f3_N_newnet_1", icon: "bed" },
    { id: "B_f3_p_newnet_2", name: "Newnet Dept (4-6)", node: "B_f3_N_newnet_2", icon: "bed" },
    { id: "B_f3_p_ped_25", name: "Pediatric Ward 25", node: "B_f3_N_ped_25", icon: "bed" },
    { id: "B_f3_p_ped_24", name: "Pediatric Ward 24", node: "B_f3_N_ped_24", icon: "bed" },
    { id: "B_f3_p_stairs_1", name: "Stairs (to F2)", node: "B_f3_N_Stairs_1", icon: "door-open" },
    { id: "B_f3_p_labour", name: "Labour Room", node: "B_f3_N_labour", icon: "heart-pulse" },
    { id: "B_f3_p_ped_icu", name: "Pediatric ICU", node: "B_f3_N_ped_icu", icon: "heart-pulse" },
    { id: "B_f3_p_obgy_28", name: "OBGY Ward 28", node: "B_f3_N_obgy_28", icon: "bed" },
    { id: "B_f3_p_obgy_29", name: "OBGY Ward 29", node: "B_f3_N_obgy_29", icon: "bed" },
    { id: "B_f3_p_stairs_2", name: "Stairs (to F2)", node: "B_f3_N_Stairs_2", icon: "door-open" },
    { id: "B_f3_p_med_store", name: "Medical Store", node: "B_f3_N_med_store", icon: "pill" },
    { id: "B_f3_p_ot_gynac", name: "OT Gynac", node: "B_f3_N_ot_gynac", icon: "syringe" },
    { id: "B_f3_p_fam_welfare", name: "Family Welfare 29", node: "B_f3_N_fam_welfare", icon: "bed" },
    { id: "B_f3_p_obgy_30", name: "OBGY Ward 30", node: "B_f3_N_obgy_30", icon: "bed" },
  ],
};


// ✅ Export all three floors
export const floorMapsB = { floor1: floor1MapB, floor2: floor2MapB, floor3: floor3MapB };

