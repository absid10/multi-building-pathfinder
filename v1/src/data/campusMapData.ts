// src/data/campusMapData.ts
import { Node, Edge, POI } from "@/utils/pathfinding";

// Nodes from your "cooridoor/path/road points"
const campusNodes: Node[] = [
 { id: "C_J_1", x: 433, y: 783 },
 { id: "C_J_2", x: 409, y: 743 },
 { id: "C_J_3", x: 439, y: 622 },
 { id: "C_J_4", x: 220, y: 552 },
 { id: "C_J_5", x: 93, y: 424 },
 { id: "C_J_6", x: 241, y: 350 },
 { id: "C_J_7", x: 300, y: 276 },
 { id: "C_J_8", x: 182, y: 282 },
 { id: "C_J_9", x: 185, y: 170 },
 { id: "C_J_10", x: 299, y: 172 },
 { id: "C_J_11", x: 460, y: 283 },
 { id: "C_J_12", x: 450, y: 453 },
 { id: "C_J_13", x: 548, y: 609 },
 { id: "C_J_14", x: 617, y: 331 },
 { id: "C_J_15", x: 841, y: 340 },
 { id: "C_J_16", x: 962, y: 346 },
 { id: "C_J_17", x: 964, y: 447 },
 { id: "C_J_18", x: 702, y: 460 },
 { id: "C_J_19", x: 463, y: 185 },
 { id: "C_J_20", x: 471, y: 21 },
 { id: "C_J_21", x: 625, y: 23 },
 { id: "C_J_22", x: 771, y: 20 },

 // Entrances from your trace
 { id: "CAMPUS_OPD_ENTRANCE", x: 518, y: 457 },
 { id: "CAMPUS_CASUALTY_ENTRANCE", x: 540, y: 186 },
 { id: "CAMPUS_DENTAL_ENTRANCE", x: 557, y: 643 },
 { id: "CAMPUS_COLLEGE_ENTRANCE", x: 249, y: 87 },
];

// Edges connecting the path in the order you traced
const campusEdges: Edge[] = [
 { from: "C_J_1", to: "C_J_2", weight: 10 },
 { from: "C_J_2", to: "C_J_3", weight: 10 },
 { from: "C_J_3", to: "C_J_4", weight: 10 },
 { from: "C_J_4", to: "C_J_5", weight: 10 },
 { from: "C_J_4", to: "C_J_6", weight: 10 },
 { from: "C_J_6", to: "C_J_7", weight: 10 },
 { from: "C_J_7", to: "C_J_8", weight: 10 },
 { from: "C_J_8", to: "C_J_9", weight: 10 },
 { from: "C_J_9", to: "C_J_10", weight: 10 },
 { from: "C_J_10", to: "C_J_11", weight: 10 },
 { from: "C_J_11", to: "C_J_12", weight: 10 },
 { from: "C_J_12", to: "C_J_13", weight: 10 },
 { from: "C_J_12", to: "C_J_14", weight: 10 },
 { from: "C_J_11", to: "C_J_14", weight: 10 },
 { from: "C_J_14", to: "C_J_15", weight: 10 },
 { from: "C_J_15", to: "C_J_16", weight: 10 },
 { from: "C_J_16", to: "C_J_17", weight: 10 },
 { from: "C_J_17", to: "C_J_18", weight: 10 },
 { from: "C_J_18", to: "C_J_13", weight: 10 },
 { from: "C_J_11", to: "C_J_19", weight: 10 },
 { from: "C_J_19", to: "C_J_20", weight: 10 },
 { from: "C_J_20", to: "C_J_21", weight: 10 },
 { from: "C_J_21", to: "C_J_22", weight: 10 },
 // Connect entrances to the nearest path junction
 { from: "C_J_13", to: "CAMPUS_DENTAL_ENTRANCE", weight: 5 },
 { from: "C_J_12", to: "CAMPUS_OPD_ENTRANCE", weight: 5 },
 { from: "C_J_10", to: "CAMPUS_CASUALTY_ENTRANCE", weight: 5 },
 { from: "C_J_19", to: "CAMPUS_CASUALTY_ENTRANCE", weight: 5 },
 { from: "C_J_9", to: "CAMPUS_COLLEGE_ENTRANCE", weight: 5 },
];

export const campusMapData = {
 id: "campus",
 name: "Main Campus",
 width: 1132,
 height: 801,
 nodes: campusNodes,
 edges: campusEdges,
 pois: [
    // ✅ --- MODIFIED: "pathNode" changed to "node" --- ✅
 { id: "C_p_opd", name: "OPD", node: "CAMPUS_OPD_ENTRANCE", icon: "door-open" },
 { id: "C_p_casualty", name: "Casualty", node: "CAMPUS_CASUALTY_ENTRANCE", icon: "door-open" },
 { id: "C_p_dental", name: "Dental", node: "CAMPUS_DENTAL_ENTRANCE", icon: "info" },
 { id: "C_p_college", name: "Medical College", node: "CAMPUS_COLLEGE_ENTRANCE", icon: "info" },
 ] as POI[],
};