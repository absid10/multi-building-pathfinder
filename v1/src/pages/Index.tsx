import { useState } from "react";
import { HospitalMap } from "@/components/HospitalMap";
import { DestinationSelector } from "@/components/DestinationSelector";
import { findPath, findNearestNode, Node } from "@/utils/pathfinding";
import { buildingMaps } from "@/data/buildingMaps";
import { CampusMap } from "@/components/CampusMap";
import { toast } from "sonner";
import { Building2, ArrowRightCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

type BuildingId = "buildingA" | "buildingB";
type FloorId = "floor1" | "floor2" | "floor3";

// (Helper function is unchanged)
const findNearestStairPair = (
  startNode: Node,
  currentFloorStairIds: string[], 
  targetFloorStairIds: string[], 
  currentMap: any,
  targetMap: any
) => {
  let closestDist = Infinity;
  let bestExitNode: Node | undefined;
  let bestEntryNode: Node | undefined;

  if (currentFloorStairIds.length !== targetFloorStairIds.length) {
    console.error("Stair array mismatch!");
    return { exitNode: undefined, entryNode: undefined };
  }

  for (let i = 0; i < currentFloorStairIds.length; i++) {
    const exitId = currentFloorStairIds[i];
    const entryId = targetFloorStairIds[i];
    const exitNode = currentMap.nodes.find((n: Node) => n.id === exitId);
    const entryNode = targetMap.nodes.find((n: Node) => n.id === entryId);
    if (!exitNode || !entryNode) continue;
    const dist = Math.hypot(startNode.x - exitNode.x, startNode.y - exitNode.y);
    if (dist < closestDist) {
      closestDist = dist;
      bestExitNode = exitNode;
      bestEntryNode = entryNode;
    }
  }
  return { exitNode: bestExitNode, entryNode: bestEntryNode };
};


const Index = () => {
  // (State is unchanged)
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingId | null>(null);
  const [currentFloor, setCurrentFloor] = useState<FloorId>("floor1");
  const [inCampusView, setInCampusView] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ x: number; y: number } | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [destinationNode, setDestinationNode] = useState<Node | null>(null);
  const [fullPath, setFullPath] = useState<Node[]>([]);
  const [activeFloors, setActiveFloors] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pendingBuildingTransition, setPendingBuildingTransition] = useState<{
    destBuilding: BuildingId;
    destFloor: FloorId;
    entryNodeId: string;
    destinationNodeId: string;
  } | null>(null);

  const isNodeOnCurrentFloor = (nodeId: string) => {
    if (currentFloor === "floor3") {
      return nodeId.startsWith("B_f3_");
    }
    if (currentFloor === "floor2") {
      return nodeId.startsWith("f2_") || nodeId.startsWith("B_f2_");
    }
    return !(nodeId.startsWith("f2_") || nodeId.startsWith("B_f2_") || nodeId.startsWith("B_f3_"));
  };


  const handleMapClick = (x: number, y: number) => {
    if (!selectedBuilding || inCampusView) return;
    setCurrentLocation({ x, y });
    toast.success("Location set", { description: "Now select a destination." });
    if (selectedDestination) calculatePath(currentLocation, selectedDestination);
  };

  const calculatePath = (location: { x: number; y: number }, destinationId: string) => {
    if (!selectedBuilding) return;

    let destBuilding: BuildingId | null = null;
    let destFloor: FloorId | null = null;

    for (const [bKey, bVal] of Object.entries(buildingMaps) as [BuildingId, any][]) {
      for (const [fKey, fVal] of Object.entries(bVal.floors) as [FloorId, any][]) {
        if (fVal.pois.some((p: any) => p.id === destinationId)) {
          destBuilding = bKey;
          destFloor = fKey;
          break;
        }
      }
    }

    if (!destBuilding || !destFloor) {
      toast.error("Destination not found");
      return;
    }

    const startMap = buildingMaps[selectedBuilding].floors[currentFloor];
    const targetMap = buildingMaps[destBuilding].floors[destFloor];
    const poi = targetMap.pois.find((p: any) => p.id === destinationId)!;
    // @ts-ignore
    const endNode = targetMap.nodes.find((n: Node) => n.id === poi.node)!;
    const startNode = findNearestNode(location, startMap.nodes);

    // 🟢 Same building + same floor
    if (selectedBuilding === destBuilding && currentFloor === destFloor) {
      const path = findPath(startNode, endNode, startMap.nodes, startMap.edges);
      setFullPath(path);
      setDestinationNode(endNode);
      setActiveFloors([currentFloor]);
      setPendingBuildingTransition(null);
      toast.success("Path ready!", { description: poi.name });
      return;
    }

    // 🟡 Same building, different floors
    if (selectedBuilding === destBuilding && currentFloor !== destFloor) {
      let segments: Node[] = [];
      let finalActiveFloors: string[] = [];

      if (selectedBuilding === "buildingA") {
        // ✅ --- UPGRADED BUILDING A LOGIC --- ✅
        const mapF1 = buildingMaps.buildingA.floors.floor1;
        const mapF2 = buildingMaps.buildingA.floors.floor2;
        const f1Stairs = ["N_Stairs_1", "N_Stairs_2"];
        const f2Stairs = ["f2_N_Stairs_1", "f2_N_Stairs_2"];
        
        let exitNode: Node | undefined;
        let entryNode: Node | undefined;

        if (currentFloor === "floor1" && destFloor === "floor2") {
          const result = findNearestStairPair(startNode, f1Stairs, f2Stairs, mapF1, mapF2);
          exitNode = result.exitNode;
          entryNode = result.entryNode;
        } else if (currentFloor === "floor2" && destFloor === "floor1") {
          const result = findNearestStairPair(startNode, f2Stairs, f1Stairs, mapF2, mapF1);
          exitNode = result.exitNode;
          entryNode = result.entryNode;
        }
        
        if (!exitNode || !entryNode) { toast.error("Stair node error A"); return; }
        
        segments.push(...findPath(startNode, exitNode, startMap.nodes, startMap.edges));
        segments.push(...findPath(entryNode, endNode, targetMap.nodes, targetMap.edges));
        finalActiveFloors = ["floor1", "floor2"];

      } else {
        // Building B (1, 2, or 3 floors)
        const f1Stairs = ["B_N_Stairs_1", "B_N_Stairs_2"];
        const f2Stairs = ["B_f2_N_Stairs_1", "B_f2_N_Stairs_2"];
        const f3Stairs = ["B_f3_N_Stairs_1", "B_f3_N_Stairs_2"];
        
        const mapF1 = buildingMaps.buildingB.floors.floor1;
        const mapF2 = buildingMaps.buildingB.floors.floor2;
        const mapF3 = buildingMaps.buildingB.floors.floor3;

        // F1 -> F2
        if (currentFloor === "floor1" && destFloor === "floor2") {
          const { exitNode, entryNode } = findNearestStairPair(startNode, f1Stairs, f2Stairs, mapF1, mapF2);
          if (!exitNode || !entryNode) { toast.error("Stair node error F1-F2"); return; }
          segments.push(...findPath(startNode, exitNode, mapF1.nodes, mapF1.edges));
          segments.push(...findPath(entryNode, endNode, mapF2.nodes, mapF2.edges));
          finalActiveFloors = ["floor1", "floor2"];
        }
        // F2 -> F1
        else if (currentFloor === "floor2" && destFloor === "floor1") {
          const { exitNode, entryNode } = findNearestStairPair(startNode, f2Stairs, f1Stairs, mapF2, mapF1);
          if (!exitNode || !entryNode) { toast.error("Stair node error F2-F1"); return; }
          segments.push(...findPath(startNode, exitNode, mapF2.nodes, mapF2.edges));
          segments.push(...findPath(entryNode, endNode, mapF1.nodes, mapF1.edges));
          finalActiveFloors = ["floor1", "floor2"];
        }
        // F2 -> F3
        else if (currentFloor === "floor2" && destFloor === "floor3") {
          const { exitNode, entryNode } = findNearestStairPair(startNode, f2Stairs, f3Stairs, mapF2, mapF3);
          if (!exitNode || !entryNode) { toast.error("Stair node error F2-F3"); return; }
          segments.push(...findPath(startNode, exitNode, mapF2.nodes, mapF2.edges));
          segments.push(...findPath(entryNode, endNode, mapF3.nodes, mapF3.edges));
          finalActiveFloors = ["floor2", "floor3"];
        }
        // F3 -> F2
        else if (currentFloor === "floor3" && destFloor === "floor2") {
          const { exitNode, entryNode } = findNearestStairPair(startNode, f3Stairs, f2Stairs, mapF3, mapF2);
          if (!exitNode || !entryNode) { toast.error("Stair node error F3-F2"); return; }
          segments.push(...findPath(startNode, exitNode, mapF3.nodes, mapF3.edges));
          segments.push(...findPath(entryNode, endNode, mapF2.nodes, mapF2.edges));
          finalActiveFloors = ["floor2", "floor3"];
        }
        // F1 -> F3 (2-hop)
        else if (currentFloor === "floor1" && destFloor === "floor3") {
          const { exitNode: exitF1, entryNode: entryF2 } = findNearestStairPair(startNode, f1Stairs, f2Stairs, mapF1, mapF2);
          if (!exitF1 || !entryNode) { toast.error("Stair node error F1-F3 (Hop 1)"); return; }
          const { exitNode: exitF2, entryNode: entryF3 } = findNearestStairPair(entryF2, f2Stairs, f3Stairs, mapF2, mapF3);
          if (!exitF2 || !entryF3) { toast.error("Stair node error F1-F3 (Hop 2)"); return; }
          
          segments.push(...findPath(startNode, exitF1, mapF1.nodes, mapF1.edges));
          segments.push(...findPath(entryF2, exitF2, mapF2.nodes, mapF2.edges));
          segments.push(...findPath(entryF3, endNode, mapF3.nodes, mapF3.edges));
          finalActiveFloors = ["floor1", "floor2", "floor3"];
        }
        // F3 -> F1 (2-hop)
        else if (currentFloor === "floor3" && destFloor === "floor1") {
          const { exitNode: exitF3, entryNode: entryF2 } = findNearestStairPair(startNode, f3Stairs, f2Stairs, mapF3, mapF2);
          if (!exitF3 || !entryF2) { toast.error("Stair node error F3-F1 (Hop 1)"); return; }
          const { exitNode: exitF2, entryNode: entryF1 } = findNearestStairPair(entryF2, f2Stairs, f1Stairs, mapF2, mapF1);
          if (!exitF2 || !entryF1) { toast.error("Stair node error F3-F1 (Hop 2)"); return; }

          segments.push(...findPath(startNode, exitF3, mapF3.nodes, mapF3.edges));
          segments.push(...findPath(entryF2, exitF2, mapF2.nodes, mapF2.edges));
          segments.push(...findPath(entryF1, endNode, mapF1.nodes, mapF1.edges));
          finalActiveFloors = ["floor1", "floor2", "floor3"];
        }
      }

      setFullPath(segments);
      setDestinationNode(endNode);
      setActiveFloors(finalActiveFloors);
      setPendingBuildingTransition(null);
      toast.info("Multi-floor route ready");
      return;
    }

    // 🔵 Cross-building navigation
    const combined: Node[] = [];
    let sourceExitNodeId: string;
    let finalActiveFloors: string[] = [];
    
    // Building B stairs
    const b_f1Stairs = ["B_N_Stairs_1", "B_N_Stairs_2"];
    const b_f2Stairs = ["B_f2_N_Stairs_1", "B_f2_N_Stairs_2"];
    const b_f3Stairs = ["B_f3_N_Stairs_1", "B_f3_N_Stairs_2"];
    // Building A stairs
    const a_f1Stairs = ["N_Stairs_1", "N_Stairs_2"];
    const a_f2Stairs = ["f2_N_Stairs_1", "f2_N_Stairs_2"];


    if (currentFloor === "floor1") {
      sourceExitNodeId = selectedBuilding === "buildingA" ? "N_Start" : "B_J_1";
      const entranceF1 = startMap.nodes.find((n: Node) => n.id === sourceExitNodeId);
      if (!entranceF1) { toast.error("Entrance node not found"); return; }
      combined.push(...findPath(startNode, entranceF1, startMap.nodes, startMap.edges));
      finalActiveFloors = ["floor1"];
    } else if (currentFloor === "floor2") {
      // F2 -> F1 -> Exit
      const mapF2 = buildingMaps[selectedBuilding].floors.floor2;
      const mapF1 = buildingMaps[selectedBuilding].floors.floor1;
      const startNodeF2 = findNearestNode(location, mapF2.nodes);
      
      const { exitNode: exitF2, entryNode: entryF1 } = (selectedBuilding === "buildingA")
        ? findNearestStairPair(startNodeF2, a_f2Stairs, a_f1Stairs, mapF2, mapF1)
        : findNearestStairPair(startNodeF2, b_f2Stairs, b_f1Stairs, mapF2, mapF1);
        
      if (!exitF2 || !entryF1) { toast.error("Cross-building stair error F2-F1"); return; }
      
      sourceExitNodeId = selectedBuilding === "buildingA" ? "N_Start" : "B_J_1";
      const entranceF1 = mapF1.nodes.find((n: Node) => n.id === sourceExitNodeId);
      if (!entranceF1) { toast.error("Entrance node not found"); return; }

      combined.push(...findPath(startNodeF2, exitF2, mapF2.nodes, mapF2.edges));
      combined.push(...findPath(entryF1, entranceF1, mapF1.nodes, mapF1.edges));
      finalActiveFloors = ["floor2", "floor1"];
    } else {
      // F3 -> F2 -> F1 -> Exit (Only Building B has a Floor 3)
      const mapF3 = buildingMaps.buildingB.floors.floor3;
      const mapF2 = buildingMaps.buildingB.floors.floor2;
      const mapF1 = buildingMaps.buildingB.floors.floor1;
      const startNodeF3 = findNearestNode(location, mapF3.nodes);

      const { exitNode: exitF3, entryNode: entryF2 } = findNearestStairPair(startNodeF3, b_f3Stairs, b_f2Stairs, mapF3, mapF2);
      if (!exitF3 || !entryF2) { toast.error("Cross-building stair error F3-F2"); return; }

      const { exitNode: exitF2, entryNode: entryF1 } = findNearestStairPair(entryF2, b_f2Stairs, b_f1Stairs, mapF2, mapF1);
      if (!exitF2 || !entryF1) { toast.error("Cross-building stair error F2-F1"); return; }

      sourceExitNodeId = "B_J_1";
      const entranceF1 = mapF1.nodes.find((n: Node) => n.id === sourceExitNodeId);
      if (!entranceF1) { toast.error("Entrance node not found"); return; }

      combined.push(...findPath(startNodeF3, exitF3, mapF3.nodes, mapF3.edges));
      combined.push(...findPath(entryF2, exitF2, mapF2.nodes, mapF2.edges));
      combined.push(...findPath(entryF1, entranceF1, mapF1.nodes, mapF1.edges));
      finalActiveFloors = ["floor3", "floor2", "floor1"];
    }

    const sourceExitNode =
      buildingMaps[selectedBuilding].floors["floor1"].nodes.find((n: Node) => n.id === sourceExitNodeId)!;

    setFullPath(combined);
    setDestinationNode(sourceExitNode);
    setActiveFloors(finalActiveFloors);
    setPendingBuildingTransition({
      destBuilding,
      destFloor,
      entryNodeId: destBuilding === "buildingA" ? "N_Start" : "B_J_1",
      destinationNodeId: endNode.id,
    });

    toast.info("Head to the exit", { description: "Tap ‘Go to Campus View’ when you reach the entrance." });
  };

  const resetNavigation = () => {
    setCurrentLocation(null);
    setSelectedDestination(null);
    setDestinationNode(null);
    setFullPath([]);
    setActiveFloors([]);
    setPendingBuildingTransition(null);
    setInCampusView(false);
    toast.info("Navigation reset");
  };

  const handleSelectBuildingFromCampus = (id: string) => {
    const picked = id as BuildingId;
    setSelectedBuilding(picked);
    setInCampusView(false);

    if (pendingBuildingTransition && picked === pendingBuildingTransition.destBuilding) {
      const entryF1 =
        buildingMaps[picked].floors["floor1"].nodes.find(
          (n: Node) => n.id === pendingBuildingTransition.entryNodeId
        )!;
      setCurrentFloor("floor1");
      setCurrentLocation({ x: entryF1.x, y: entryF1.y });

      const destFloor = pendingBuildingTransition.destFloor;
      const destNodeId = pendingBuildingTransition.destinationNodeId;
      let segments: Node[] = [];
      let finalActiveFloors: string[] = [];
      
      const mapF1 = buildingMaps[picked].floors.floor1;
      const mapF2 = buildingMaps[picked].floors.floor2;
      const mapF3 = buildingMaps[picked].floors.floor3; // Will be undefined for Building A

      if (destFloor === "floor1") {
        // @ts-ignore
        const destNode = mapF1.nodes.find((n: Node) => n.id === destNodeId)!;
        segments.push(...findPath(entryF1, destNode, mapF1.nodes, mapF1.edges));
        finalActiveFloors = ["floor1"];
        toast.success("Entered building", { description: "Continue to your destination." });
      
      } else if (destFloor === "floor2") {
        // @ts-ignore
        const destNode = mapF2.nodes.find((n: Node) => n.id === destNodeId)!;
        
        const f1Stairs = picked === 'buildingA' ? ["N_Stairs_1", "N_Stairs_2"] : ["B_N_Stairs_1", "B_N_Stairs_2"];
        const f2Stairs = picked === 'buildingA' ? ["f2_N_Stairs_1", "f2_N_Stairs_2"] : ["B_f2_N_Stairs_1", "B_f2_N_Stairs_2"];
        
        const { exitNode: exitF1, entryNode: entryF2 } = findNearestStairPair(entryF1, f1Stairs, f2Stairs, mapF1, mapF2);
        if (!exitF1 || !entryNode) { toast.error("Stair node error on entry"); return; }
        
        segments.push(...findPath(entryF1, exitF1, mapF1.nodes, mapF1.edges));
        segments.push(...findPath(entryF2, destNode, mapF2.nodes, mapF2.edges));
        finalActiveFloors = ["floor1", "floor2"];
        toast.success("Entered building", { description: "Follow path and go up to Floor 2." });
      
      } else if (destFloor === "floor3" && picked === 'buildingB') { // Only B has Floor 3
        // @ts-ignore
        const destNode = mapF3.nodes.find((n: Node) => n.id === destNodeId)!;
        const f1Stairs = ["B_N_Stairs_1", "B_N_Stairs_2"];
        const f2Stairs = ["B_f2_N_Stairs_1", "B_f2_N_Stairs_2"];
        const f3Stairs = ["B_f3_N_Stairs_1", "B_f3_N_Stairs_2"];

        const { exitNode: exitF1, entryNode: entryF2_1 } = findNearestStairPair(entryF1, f1Stairs, f2Stairs, mapF1, mapF2);
        if (!exitF1 || !entryF2_1) { toast.error("Stair node error on entry (F1-F2)"); return; }
        
        const { exitNode: exitF2, entryNode: entryF3 } = findNearestStairPair(entryF2_1, f2Stairs, f3Stairs, mapF2, mapF3);
        if (!exitF2 || !entryF3) { toast.error("Stair node error on entry (F2-F3)"); return; }

        segments.push(...findPath(entryF1, exitF1, mapF1.nodes, mapF1.edges));
        segments.push(...findPath(entryF2_1, exitF2, mapF2.nodes, mapF2.edges));
        segments.push(...findPath(entryF3, destNode, mapF3.nodes, mapF3.edges));
        finalActiveFloors = ["floor1", "floor2", "floor3"];
        toast.success("Entered building", { description: "Follow path and go up to Floor 3." });
      }
      
      setFullPath(segments);
      setDestinationNode(finalActiveFloors.length > 0 ? segments[segments.length - 1] : null);
      setActiveFloors(finalActiveFloors);
      setPendingBuildingTransition(null);
    }
  };

  if (!selectedBuilding || inCampusView) {
    return (
      <div className="min-h-screen bg-background p-8">
        ...
        {pendingBuildingTransition && (
          <div className="mb-4 text-sm bg-primary/10 border border-primary/30 text-primary rounded-md p-3">
            Tap <b>{pendingBuildingTransition.destBuilding === "buildingA" ? "OPD" : "Casualty"}</b> to
            enter and continue your route.
          </div>
        )}
        <CampusMap 
          onSelectBuilding={handleSelectBuildingFromCampus} 
          isNavigating={!!pendingBuildingTransition}
        />
      </div>
    );
  }

  const currentMap = buildingMaps[selectedBuilding].floors[currentFloor];
  const floorPath = fullPath.filter((n) => isNodeOnCurrentFloor(n.id));

  return (
    <div className={`min-h-screen bg-background ${isFullscreen ? "" : "p-4 md:p-8"}`}>
      <div className={`${isFullscreen ? "w-full h-screen relative" : "max-w-7xl mx-auto space-y-6"}`}>
        {!isFullscreen && (
          <header className="bg-card rounded-lg shadow-lg border border-border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {buildingMaps[selectedBuilding].name}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {currentFloor === "floor1" ? "Ground Floor" : currentFloor === "floor2" ? "Floor 2" : "Floor 3"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              {(Object.keys(buildingMaps[selectedBuilding].floors) as FloorId[]).map((f) => (
                <button
                  key={f}
                  className={`px-5 py-3 text-sm rounded-md border transition-all ${
                    currentFloor === f
                      ? "bg-primary text-white border-primary"
                      : "bg-card text-foreground hover:bg-muted"
                  }`}
                  style={{ display: (selectedBuilding === 'buildingA' && f === 'floor3') ? 'none' : 'block' }}
                  onClick={() => setCurrentFloor(f)}
                >
                  {f === "floor1" ? "Floor 1" : f === "floor2" ? "Floor 2" : "Floor 3"}
                </button>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedBuilding(null);
                  setInCampusView(true);
                }}
              >
                <Home className="w-4 h-4 mr-2" /> Back to Campus
              </Button>
            </div>
          </header>
        )}

        {/* Map + Popups */}
        <div className={`${isFullscreen ? "w-full h-full relative" : "relative pb-16"}`}>
          <HospitalMap
            selectedBuilding={selectedBuilding}
            currentFloor={currentFloor}
            path={floorPath}
            currentLocation={currentLocation}
            destinationNode={destinationNode}
            onMapClick={handleMapClick}
          />

          {/* 🧭 Floor-change popup */}
          {fullPath.length > 0 &&
            destinationNode &&
            (activeFloors.length > 1 || (pendingBuildingTransition && currentFloor !== "floor1")) &&
            (() => {
              const floorMap: { [key: string]: { up?: FloorId, down?: FloorId } } = {
                "floor1": { up: "floor2" },
                "floor2": { up: "floor3", down: "floor1" },
                "floor3": { down: "floor2" },
              };

              const getStairIds = (floor: FloorId) => {
                if (floor === 'floor1') return ["B_N_Stairs_1", "B_N_Stairs_2", "N_Stairs_1", "N_Stairs_2"];
                if (floor === 'floor2') return ["B_f2_N_Stairs_1", "B_f2_N_Stairs_2", "f2_N_Stairs_1", "f2_N_Stairs_2"];
                if (floor === 'floor3') return ["B_f3_N_Stairs_1", "B_f3_N_Stairs_2"];
                return [];
              }
              
              const currentStairIds = getStairIds(currentFloor);
              const nearStairs = fullPath.some((n) => currentStairIds.some(id => n.id.includes(id)));
              if (!nearStairs) return null;

              const currentFloorNum = parseInt(currentFloor.replace('floor', ''));
              const isMultiHop = activeFloors.length > 2;
              
              let nextFloor: FloorId | undefined = undefined;
              let direction: "up" | "down" | undefined = undefined;
              let destFloorName: string = "";

              if (isMultiHop) {
                const finalFloorId = activeFloors[activeFloors.length - 1] as FloorId;
                destFloorName = finalFloorId === "floor1" ? "Ground Floor" : finalFloorId === "floor2" ? "Floor 2" : "Floor 3";
              }

              if (activeFloors.includes(`floor${currentFloorNum + 1}`)) {
                direction = "up";
                nextFloor = floorMap[currentFloor]?.up;
              } else if (activeFloors.includes(`floor${currentFloorNum - 1}`)) {
                direction = "down";
                nextFloor = floorMap[currentFloor]?.down;
              }

              if (!direction) {
                if (currentFloor === "floor1" && activeFloors.includes("floor2")) {
                   nextFloor = "floor2";
                   direction = "up";
                } else if (currentFloor === "floor3" && activeFloors.includes("floor2")) {
                   nextFloor = "floor2";
                   direction = "down";
                } else if (currentFloor === "floor2" && activeFloors.includes("floor3")) {
                   nextFloor = "floor3";
                   direction = "up";
                } else if (currentFloor === "floor2" && activeFloors.includes("floor1")) {
                   nextFloor = "floor1";
                   direction = "down";
                }
              }

              if (!nextFloor || !direction) return null;

              let popupText = "";
              if (direction === "up") {
                const nextFloorName = nextFloor === "floor2" ? "Floor 2" : "Floor 3";
                if (isMultiHop && currentFloor === "floor1") {
                  popupText = `Go up to Floor 2 (on your way to ${destFloorName})?`;
                } else {
                  popupText = `You’ve reached the stairs. Go up to ${nextFloorName}?`;
                }
              } else {
                const nextFloorName = nextFloor === "floor2" ? "Floor 2" : "Ground Floor";
                if (isMultiHop && currentFloor === "floor3") {
                  popupText = `Go down to Floor 2 (on your way to ${destFloorName})?`;
                } else {
                  popupText = `You’ve reached the stairs. Go down to ${nextFloorName}?`;
                }
              }

              return (
                <div className="absolute bottom-6 right-6 bg-card/95 backdrop-blur border border-border rounded-xl shadow-lg p-4">
                  <p className="text-sm font-medium mb-3">
                    {popupText}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentFloor(nextFloor!)}
                      className="flex items-center gap-2"
                    >
                      <ArrowRightCircle className="w-4 h-4" />
                      Change Floor
                    </Button>
                    <Button variant="outline" onClick={() => toast.info("Floor change canceled")}>
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            })()}

          {/* 🔔 Inter-building transition popup (only on floor 1) */}
          {pendingBuildingTransition &&
            selectedBuilding !== pendingBuildingTransition.destBuilding &&
            !isFullscreen &&
            currentFloor === "floor1" && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur border border-border rounded-xl shadow-lg p-4 flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-foreground text-center">
                  Route continues to{" "}
                  <span className="font-bold text-primary">
                    {/* ✅ UPDATED to use correct building names */}
                    {pendingBuildingTransition.destBuilding === "buildingA"
                      ? "OPD"
                      : "Casualty"}
                  </span>
                </p>
                <Button
                  onClick={() => setInCampusView(true)}
                  className="flex items-center gap-2"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  Go to Campus View
                </Button>
              </div>
            )}
        </div>

        {/* Destination selector */}
        {!isFullscreen && currentMap && (
          <DestinationSelector
            selectedFloor={currentFloor}
            selectedDestination={selectedDestination}
            onDestinationChange={(id) => {
              setSelectedDestination(id);
              if (currentLocation) calculatePath(currentLocation, id);
            }}
            onReset={resetNavigation}
            hasCurrentLocation={!!currentLocation}
            hasPath={fullPath.length > 0}
            activeFloors={activeFloors}
            onCancelRoute={resetNavigation}
          />
        )}
      </div>
    </div>
  );
};

export default Index;