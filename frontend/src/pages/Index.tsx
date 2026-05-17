import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HospitalMap } from "@/components/HospitalMap";
import { DestinationSelector } from "@/components/DestinationSelector";
import { findPath, findNearestNode, Node } from "@/utils/pathfinding";
import { getMapBuildings } from "@/data/buildingMaps";
import { loadMapBuildingsFromBackend, type FrontendBuildings } from "@/services/mapDataApi";
import { CampusMap } from "@/components/CampusMap";
import { toast } from "sonner";
import { Building2, ArrowRightCircle, Home, ArrowLeft, Navigation, AlertTriangle, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavigationBrief } from "@/components/NavigationBrief";
import { useIndoorTracking } from "@/hooks/useIndoorTracking";
import { useDeviceHeading } from "@/hooks/useDeviceHeading";

type BuildingId = "buildingA" | "buildingB";
type FloorId = "floor1" | "floor2" | "floor3";

const getBuildingLabel = (buildings: any, id: BuildingId) => {
  const fallback = id === "buildingA" ? "Building A" : "Building B";
  return buildings?.[id]?.name || fallback;
};

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

const isStairNodeId = (id: string) => /stairs/i.test(id);

const normalizeStairNodeId = (id: string) =>
  id
    .split("_")
    .filter((part) => part !== "B" && !/^f\d+$/i.test(part))
    .join("_")
    .toLowerCase();

const getStairNodes = (map: any): Node[] =>
  (map?.nodes || []).filter((n: Node) => isStairNodeId(n.id));

const findNearestStairTransition = (
  startNode: Node,
  currentMap: any,
  targetMap: any
) => {
  const currentStairs = getStairNodes(currentMap);
  const targetStairs = getStairNodes(targetMap);

  const targetByKey = new Map<string, Node>();
  for (const n of targetStairs) {
    targetByKey.set(normalizeStairNodeId(n.id), n);
  }

  let closestDist = Infinity;
  let bestExitNode: Node | undefined;
  let bestEntryNode: Node | undefined;

  for (const exitNode of currentStairs) {
    const entryNode = targetByKey.get(normalizeStairNodeId(exitNode.id));
    if (!entryNode) continue;
    const dist = Math.hypot(startNode.x - exitNode.x, startNode.y - exitNode.y);
    if (dist < closestDist) {
      closestDist = dist;
      bestExitNode = exitNode;
      bestEntryNode = entryNode;
    }
  }

  if (bestExitNode && bestEntryNode) {
    return { exitNode: bestExitNode, entryNode: bestEntryNode };
  }

  const fallbackCurrent = currentStairs.map((n) => n.id).sort();
  const fallbackTarget = targetStairs.map((n) => n.id).sort();
  return findNearestStairPair(startNode, fallbackCurrent, fallbackTarget, currentMap, targetMap);
};


const Index = () => {
  const ENABLE_EXPERIMENTAL_TRACKING =
    String(import.meta.env.VITE_ENABLE_EXPERIMENTAL_TRACKING ?? "false").toLowerCase() === "true";
  const navigate = useNavigate();
  const { mapId } = useParams<{ mapId: string }>();
  const isGecaMap = (mapId || "").includes("geca");
  
  // Get map-specific building data (backend first, hardcoded fallback)
  const [currentMapBuildings, setCurrentMapBuildings] = useState<FrontendBuildings>(
    getMapBuildings(mapId || "gmch-chhatrapati") as FrontendBuildings
  );

  useEffect(() => {
    let cancelled = false;
    const activeMapId = mapId || "gmch-chhatrapati";
    loadMapBuildingsFromBackend(activeMapId).then((buildings) => {
      if (!cancelled) {
        setCurrentMapBuildings(buildings);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mapId]);
  
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
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(true);
  const [headingUpEnabled, setHeadingUpEnabled] = useState(false);
  // Orient & Go: user must align before stepping; resets on floor change
  const [navigationActive, setNavigationActive] = useState(false);

  // Reset navigation active whenever floor changes (floor transition = new alignment needed)
  useEffect(() => {
    setNavigationActive(false);
  }, [currentFloor]);

  // Reset navigationActive when path is cleared
  useEffect(() => {
    if (fullPath.length === 0) setNavigationActive(false);
  }, [fullPath.length]);
  const [pendingBuildingTransition, setPendingBuildingTransition] = useState<{
    destBuilding: BuildingId;
    destFloor: FloorId;
    entryNodeId: string;
    destinationNodeId: string;
  } | null>(null);
  // Always get heading — needed for direction validation, not just heading-up mode
  const headingState = useDeviceHeading(
    ENABLE_EXPERIMENTAL_TRACKING && liveTrackingEnabled
  );

  const trackingState = useIndoorTracking(
    fullPath,
    liveTrackingEnabled && fullPath.length > 1,
    {
      experimentalEnabled: ENABLE_EXPERIMENTAL_TRACKING,
      headingDegrees: headingState.heading,
      headingTrusted: headingState.isFlat,
      navigationActive,
    }
  );

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
    if (selectedDestination) calculatePath({ x, y }, selectedDestination);
  };

  const calculatePath = (location: { x: number; y: number }, destinationId: string) => {
    if (!selectedBuilding) return;

    let destBuilding: BuildingId | null = null;
    let destFloor: FloorId | null = null;

    for (const [bKey, bVal] of Object.entries(currentMapBuildings) as [BuildingId, any][]) {
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

    const startMap = currentMapBuildings[selectedBuilding].floors[currentFloor];
    const targetMap = currentMapBuildings[destBuilding].floors[destFloor];
    const poi = targetMap.pois.find((p: any) => p.id === destinationId)!;
    const endNode = targetMap.nodes.find((n: Node) => n.id === poi.node)!;
    const startNode = findNearestNode(location, startMap.nodes);

    // Create virtual start node at exact click location
    const userStartNode: Node = {
      id: "user-temp-start",
      x: location.x,
      y: location.y
    };

    // 🟢 Same building + same floor
    if (selectedBuilding === destBuilding && currentFloor === destFloor) {
      const pathNodes = findPath(startNode, endNode, startMap.nodes, startMap.edges);
      setFullPath([userStartNode, ...pathNodes]); // Prepend user click
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
        const mapF1 = currentMapBuildings.buildingA.floors.floor1;
        const mapF2 = currentMapBuildings.buildingA.floors.floor2;
        
        let exitNode: Node | undefined;
        let entryNode: Node | undefined;

        if (currentFloor === "floor1" && destFloor === "floor2") {
          const result = findNearestStairTransition(startNode, mapF1, mapF2);
          exitNode = result.exitNode;
          entryNode = result.entryNode;
        } else {
          const result = findNearestStairTransition(startNode, mapF2, mapF1);
          exitNode = result.exitNode;
          entryNode = result.entryNode;
        }
        
        if (!exitNode || !entryNode) { toast.error("Stair node error A"); return; }
        
        segments.push(...findPath(startNode, exitNode, startMap.nodes, startMap.edges));
        segments.push(...findPath(entryNode, endNode, targetMap.nodes, targetMap.edges));
        finalActiveFloors = ["floor1", "floor2"];
      } else {
        const mapF1 = currentMapBuildings.buildingB.floors.floor1;
        const mapF2 = currentMapBuildings.buildingB.floors.floor2;
        const mapF3 = currentMapBuildings.buildingB.floors.floor3;

        if (currentFloor === "floor1" && destFloor === "floor2") {
          const { exitNode, entryNode } = findNearestStairTransition(startNode, mapF1, mapF2);
          segments.push(...findPath(startNode, exitNode, mapF1.nodes, mapF1.edges));
          segments.push(...findPath(entryNode, endNode, mapF2.nodes, mapF2.edges));
          finalActiveFloors = ["floor1", "floor2"];
        } else if (currentFloor === "floor2" && destFloor === "floor1") {
          const { exitNode, entryNode } = findNearestStairTransition(startNode, mapF2, mapF1);
          segments.push(...findPath(startNode, exitNode, mapF2.nodes, mapF2.edges));
          segments.push(...findPath(entryNode, endNode, mapF1.nodes, mapF1.edges));
          finalActiveFloors = ["floor1", "floor2"];
        } else if (currentFloor === "floor2" && destFloor === "floor3") {
          const { exitNode, entryNode } = findNearestStairTransition(startNode, mapF2, mapF3);
          segments.push(...findPath(startNode, exitNode, mapF2.nodes, mapF2.edges));
          segments.push(...findPath(entryNode, endNode, mapF3.nodes, mapF3.edges));
          finalActiveFloors = ["floor2", "floor3"];
        } else if (currentFloor === "floor3" && destFloor === "floor2") {
          const { exitNode, entryNode } = findNearestStairTransition(startNode, mapF3, mapF2);
          segments.push(...findPath(startNode, exitNode, mapF3.nodes, mapF3.edges));
          segments.push(...findPath(entryNode, endNode, mapF2.nodes, mapF2.edges));
          finalActiveFloors = ["floor2", "floor3"];
        } else if (currentFloor === "floor1" && destFloor === "floor3") {
          const { exitNode: ex1, entryNode: en2 } = findNearestStairTransition(startNode, mapF1, mapF2);
          const { exitNode: ex2, entryNode: en3 } = findNearestStairTransition(en2!, mapF2, mapF3);
          segments.push(...findPath(startNode, ex1!, mapF1.nodes, mapF1.edges), ...findPath(en2!, ex2!, mapF2.nodes, mapF2.edges), ...findPath(en3!, endNode, mapF3.nodes, mapF3.edges));
          finalActiveFloors = ["floor1", "floor2", "floor3"];
        } else if (currentFloor === "floor3" && destFloor === "floor1") {
          const { exitNode: ex3, entryNode: en2 } = findNearestStairTransition(startNode, mapF3, mapF2);
          const { exitNode: ex2, entryNode: en1 } = findNearestStairTransition(en2!, mapF2, mapF1);
          segments.push(...findPath(startNode, ex3!, mapF3.nodes, mapF3.edges), ...findPath(en2!, ex2!, mapF2.nodes, mapF2.edges), ...findPath(en1!, endNode, mapF1.nodes, mapF1.edges));
          finalActiveFloors = ["floor1", "floor2", "floor3"];
        }
      }

      setFullPath([userStartNode, ...segments]); // Prepend user click
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

    if (currentFloor === "floor1") {
      sourceExitNodeId = selectedBuilding === "buildingA" ? "N_Start" : "B_J_1";
      const entranceF1 = startMap.nodes.find((n: Node) => n.id === sourceExitNodeId);
      combined.push(...findPath(startNode, entranceF1!, startMap.nodes, startMap.edges));
      finalActiveFloors = ["floor1"];
    } else if (currentFloor === "floor2") {
      const mapF2 = currentMapBuildings[selectedBuilding].floors.floor2;
      const mapF1 = currentMapBuildings[selectedBuilding].floors.floor1;
      const { exitNode: ex2, entryNode: en1 } = findNearestStairTransition(startNode, mapF2, mapF1);
      
      sourceExitNodeId = selectedBuilding === "buildingA" ? "N_Start" : "B_J_1";
      const entranceF1 = mapF1.nodes.find((n: Node) => n.id === sourceExitNodeId);
      combined.push(...findPath(startNode, ex2!, mapF2.nodes, mapF2.edges));
      combined.push(...findPath(en1!, entranceF1!, mapF1.nodes, mapF1.edges));
      finalActiveFloors = ["floor2", "floor1"];
    } else {
      const mapF3 = currentMapBuildings.buildingB.floors.floor3;
      const mapF2 = currentMapBuildings.buildingB.floors.floor2;
      const mapF1 = currentMapBuildings.buildingB.floors.floor1;
      const { exitNode: ex3, entryNode: en2 } = findNearestStairTransition(startNode, mapF3, mapF2);
      const { exitNode: ex2, entryNode: en1 } = findNearestStairTransition(en2!, mapF2, mapF1);
      sourceExitNodeId = "B_J_1";
      const entranceF1 = mapF1.nodes.find((n: Node) => n.id === sourceExitNodeId);
      combined.push(...findPath(startNode, ex3!, mapF3.nodes, mapF3.edges), ...findPath(en2!, ex2!, mapF2.nodes, mapF2.edges), ...findPath(en1!, entranceF1!, mapF1.nodes, mapF1.edges));
      finalActiveFloors = ["floor3", "floor2", "floor1"];
    }

    const sourceExitNode = currentMapBuildings[selectedBuilding].floors["floor1"].nodes.find((n: Node) => n.id === sourceExitNodeId)!;

    setFullPath([userStartNode, ...combined]); // Prepend user click
    setDestinationNode(sourceExitNode);
    setActiveFloors(finalActiveFloors);
    setPendingBuildingTransition({
      destBuilding,
      destFloor,
      entryNodeId: destBuilding === "buildingA" ? "N_Start" : "B_J_1",
      destinationNodeId: endNode.id,
    });

    toast.info("Head to the exit");
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
    if (isGecaMap) {
      const pickedLabel = id === "buildingA"
        ? getBuildingLabel(currentMapBuildings, "buildingA")
        : getBuildingLabel(currentMapBuildings, "buildingB");
      toast.info("Mapping pending", {
        description: `${pickedLabel} indoor floor mapping is pending. Campus-level view is available.`,
      });
      return;
    }

    const picked = id as BuildingId;
    setSelectedBuilding(picked);
    setInCampusView(false);
    setCurrentFloor("floor1");

    if (pendingBuildingTransition && picked === pendingBuildingTransition.destBuilding) {
      const entryF1 =
        currentMapBuildings[picked].floors["floor1"].nodes.find(
          (n: Node) => n.id === pendingBuildingTransition.entryNodeId
        )!;
      setCurrentFloor("floor1");
      setCurrentLocation({ x: entryF1.x, y: entryF1.y });

      const destFloor = pendingBuildingTransition.destFloor;
      const destNodeId = pendingBuildingTransition.destinationNodeId;
      let segments: Node[] = [];
      let finalActiveFloors: string[] = [];
      
      const mapF1 = currentMapBuildings[picked].floors.floor1;
      const mapF2 = currentMapBuildings[picked].floors.floor2;
      const mapF3 = currentMapBuildings[picked].floors.floor3; // Will be undefined for Building A

      if (destFloor === "floor1") {
        // @ts-ignore
        const destNode = mapF1.nodes.find((n: Node) => n.id === destNodeId)!;
        segments.push(...findPath(entryF1, destNode, mapF1.nodes, mapF1.edges));
        finalActiveFloors = ["floor1"];
        toast.success("Entered building", { description: "Continue to your destination." });
      
      } else if (destFloor === "floor2") {
        // @ts-ignore
        const destNode = mapF2.nodes.find((n: Node) => n.id === destNodeId)!;

        const { exitNode: exitF1, entryNode: entryF2 } = findNearestStairTransition(entryF1, mapF1, mapF2);
        if (!exitF1 || !entryF2) { toast.error("Stair node error on entry"); return; }
        
        segments.push(...findPath(entryF1, exitF1, mapF1.nodes, mapF1.edges));
        segments.push(...findPath(entryF2, destNode, mapF2.nodes, mapF2.edges));
        finalActiveFloors = ["floor1", "floor2"];
        toast.success("Entered building", { description: "Follow path and go up to Floor 2." });
      
      } else if (destFloor === "floor3" && picked === 'buildingB') { // Only B has Floor 3
        // @ts-ignore
        const destNode = mapF3.nodes.find((n: Node) => n.id === destNodeId)!;

        const { exitNode: exitF1, entryNode: entryF2_1 } = findNearestStairTransition(entryF1, mapF1, mapF2);
        if (!exitF1 || !entryF2_1) { toast.error("Stair node error on entry (F1-F2)"); return; }

        const { exitNode: exitF2, entryNode: entryF3 } = findNearestStairTransition(entryF2_1, mapF2, mapF3);
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
        <div className="max-w-7xl mx-auto mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <div className="rounded-2xl border border-border bg-card shadow-lg p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">
              Smart Indoor Navigation Platform
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Select a Hospital to Navigate
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-4xl">
              Choose a building below to start your indoor wayfinding journey.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto">
          {pendingBuildingTransition && (
            <div className="mb-4 text-sm bg-primary/10 border border-primary/30 text-primary rounded-md p-3">
              Tap <b>{getBuildingLabel(currentMapBuildings, pendingBuildingTransition.destBuilding)}</b> to
              enter and continue your route.
            </div>
          )}
          <CampusMap 
            onSelectBuilding={handleSelectBuildingFromCampus} 
            isNavigating={!!pendingBuildingTransition}
            mapId={mapId || "gmch-chhatrapati"}
            buildingALabel={currentMapBuildings?.buildingA?.name}
            buildingBLabel={currentMapBuildings?.buildingB?.name}
            disableBuildingNavigation={isGecaMap}
          />
        </div>
      </div>
    );
  }

  const currentMap = currentMapBuildings[selectedBuilding].floors[currentFloor];
  if (!currentMap) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-3xl mx-auto rounded-xl border border-border bg-card p-6 shadow-md space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Floor unavailable</h2>
          <p className="text-sm text-muted-foreground">
            The selected floor is not available for this building. Switching you back to Floor 1.
          </p>
          <Button onClick={() => setCurrentFloor("floor1")}>Go to Floor 1</Button>
        </div>
      </div>
    );
  }
  const floorPath = fullPath.filter((n) => isNodeOnCurrentFloor(n.id));
  const displayedLocation = (liveTrackingEnabled && fullPath.length > 1) 
    ? (trackingState.currentPosition ?? currentLocation) 
    : currentLocation;

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
                  {getBuildingLabel(currentMapBuildings, selectedBuilding)}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {currentFloor === "floor1" ? "Ground Floor" : currentFloor === "floor2" ? "Floor 2" : "Floor 3"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              {(Object.keys(currentMapBuildings[selectedBuilding].floors) as FloorId[]).map((f) => (
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
            currentLocation={displayedLocation}
            destinationNode={destinationNode}
            onMapClick={handleMapClick}
            buildings={currentMapBuildings}
            headingDegrees={headingState.heading}
            headingUpEnabled={ENABLE_EXPERIMENTAL_TRACKING && headingUpEnabled}
          />


          {/* 🧭 Orient & Go — Alignment UI overlaid on map */}
          {ENABLE_EXPERIMENTAL_TRACKING && liveTrackingEnabled && fullPath.length > 1 && (() => {

            // ── Phone flat warning (overrides everything) ──────────────────
            if (headingState.hasReading && !headingState.isFlat) {
              return (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/90 border border-orange-400 text-white text-sm font-semibold shadow-lg backdrop-blur-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Hold phone flat (screen up)
                  </div>
                </div>
              );
            }

            // ── Waiting for first compass reading ─────────────────────────
            if (!headingState.hasReading) {
              // Browser requires a user tap to grant permission (iOS 13+)
              if (headingState.permissionNeeded) {
                return (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
                    <button
                      onClick={() => headingState.requestPermission()}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border border-blue-400 text-white text-sm font-semibold shadow-lg backdrop-blur-sm transition-all"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Tap to enable compass
                    </button>
                  </div>
                );
              }
              // Auto-permission browser — waiting for first reading (will auto-skip after 3s)
              return (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/90 border border-yellow-400 text-white text-xs font-semibold shadow backdrop-blur-sm">
                    <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                    Waiting for compass…
                  </div>
                </div>
              );
            }

            // ── NAVIGATING — step-driven, no compass ──────────────────────
            if (navigationActive) {
              return (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/90 border border-blue-400 text-white text-sm font-semibold shadow-lg backdrop-blur-sm">
                    <Navigation className="w-4 h-4" />
                    Navigating — {trackingState.remainingDistanceFt} ft left
                  </div>
                </div>
              );
            }

            // ── PRE-NAVIGATION — alignment required ───────────────────────
            const bearing = trackingState.requiredBearing;
            const aligned = trackingState.isFacingCorrectDirection;
            const currentDeg = Math.round(headingState.heading);
            const requiredDeg = bearing !== null ? Math.round(bearing) : null;

            return (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 w-72">

                {/* Alignment status pill */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border text-sm font-semibold backdrop-blur-sm transition-all duration-300 w-full justify-center ${
                  aligned
                    ? "bg-green-500/90 border-green-400 text-white"
                    : "bg-red-500/90 border-red-400 text-white"
                }`}>
                  {aligned
                    ? <><Navigation className="w-4 h-4" /> Aligned! Ready to start</>
                    : <><AlertTriangle className="w-4 h-4 animate-pulse" /> Turn to face path</>
                  }
                </div>

                {/* Bearing debug info */}
                {requiredDeg !== null && (
                  <div className="flex items-center gap-3 bg-black/60 text-white text-xs px-4 py-1.5 rounded-full backdrop-blur-sm w-full justify-center">
                    <span>You: <b>{currentDeg}°</b></span>
                    <span className="opacity-40">|</span>
                    <span>Need: <b>{requiredDeg}°</b></span>
                  </div>
                )}

                {/* Start Navigation button — only active when aligned */}
                <button
                  disabled={!aligned}
                  onClick={() => setNavigationActive(true)}
                  className={`w-full py-3 rounded-full text-sm font-bold shadow-lg border transition-all duration-300 ${
                    aligned
                      ? "bg-green-600 hover:bg-green-700 border-green-500 text-white cursor-pointer"
                      : "bg-gray-400/80 border-gray-400 text-white/60 cursor-not-allowed"
                  }`}
                >
                  {aligned ? "▶ Start Navigation" : "Align first to start"}
                </button>

              </div>
            );
          })()}


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
                const map = currentMapBuildings[selectedBuilding]?.floors?.[floor];
                return getStairNodes(map).map((n) => n.id);
              };

              const currentStairIds = new Set(getStairIds(currentFloor));
              const nearStairs = fullPath.some((n) => currentStairIds.has(n.id));
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
                    onClick={() => {
                      // 1. Determine which floor we are going to
                      const targetFloor = nextFloor!;

                      // 2. Find the index of the FIRST node on that specific floor in our path
                      const entryNodeIdx = fullPath.findIndex(n => {
                        if (targetFloor === "floor1") return !n.id.startsWith("f2_") && !n.id.startsWith("B_f2_") && !n.id.startsWith("B_f3_");
                        if (targetFloor === "floor2") return n.id.startsWith("f2_") || n.id.startsWith("B_f2_");
                        if (targetFloor === "floor3") return n.id.startsWith("B_f3_");
                        return false;
                      });

                      if (entryNodeIdx !== -1) {
                        // 3. Slice the path so it starts exactly at the transition node
                        const newSliccedPath = fullPath.slice(entryNodeIdx);
                        setFullPath(newSliccedPath);
                        
                        // 4. Snap the user marker to the stair node on the new map
                        setCurrentLocation({ x: newSliccedPath[0].x, y: newSliccedPath[0].y });
                      }

                      // 5. Switch the map view and force re-alignment
                      setCurrentFloor(targetFloor);
                      setNavigationActive(false); 
                    }}
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
                    {getBuildingLabel(currentMapBuildings, pendingBuildingTransition.destBuilding)}
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

        {!isFullscreen && (
          <NavigationBrief
            path={fullPath}
            nextInstruction={trackingState.nextInstruction}
            remainingDistanceFt={trackingState.remainingDistanceFt}
            etaMinutes={trackingState.etaMinutes}
            trackingEnabled={liveTrackingEnabled}
            onTrackingChange={setLiveTrackingEnabled}
            headingUpEnabled={headingUpEnabled}
            onHeadingUpChange={setHeadingUpEnabled}
            experimentalEnabled={ENABLE_EXPERIMENTAL_TRACKING}
            stepCount={trackingState.stepCount}
            isFacingCorrectDirection={trackingState.isFacingCorrectDirection}
          />
        )}

        {/* Destination selector */}
        {!isFullscreen && currentMap && (
          <DestinationSelector
            buildings={currentMapBuildings}
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