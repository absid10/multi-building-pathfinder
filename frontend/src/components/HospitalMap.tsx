import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { Node } from "@/utils/pathfinding";
import { buildingMaps } from "@/data/buildingMaps";
import {
  Activity,
  Pill,
  Utensils,
  HeartPulse,
  Info,
  DoorOpen,
  Bed,
  Droplet,
  Syringe,
  Archive,
  Hammer,
  Eye,
} from "lucide-react";


interface HospitalMapProps {
  selectedBuilding: "buildingA" | "buildingB";
  currentFloor: "floor1" | "floor2" | "floor3"; 
  path: Node[];
  currentLocation: { x: number; y: number } | null;
  destinationNode: Node | null;
  onMapClick: (x: number, y: number) => void;
}

type RoomArea = {
  id: string;
  nodeId: string;
  type?: "poly" | "rect"; 
  points?: string;       
  x?: number;            
  y?: number;
  width?: number;
  height?: number;
};


const iconMap: Record<string, any> = {
  activity: Activity,
  pill: Pill,
  utensils: Utensils,
  "heart-pulse": HeartPulse,
  info: Info,
  "door-open": DoorOpen,
  bed: Bed,
  droplet: Droplet,
  syringe: Syringe,
  archive: Archive,
  construction: Hammer,
  hammer: Hammer,
  eye: Eye,
};



export const HospitalMap = ({
  selectedBuilding,
  currentFloor,
  path,
  currentLocation,
  destinationNode,
  onMapClick,
}: HospitalMapProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const contentRef = useRef<SVGGElement>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef({ lastDist: 0, isPinching: false });
  const rafRef = useRef<number | null>(null);

  const mapData = buildingMaps[selectedBuilding].floors[currentFloor];

  const isNodeOnCurrentFloor = (nodeId: string) => {
    if (currentFloor === "floor3") {
      return nodeId.startsWith("B_f3_");
    }
    if (currentFloor === "floor2") {
      return nodeId.startsWith("f2_") || nodeId.startsWith("B_f2_");
    }
    return !(nodeId.startsWith("f2_") || nodeId.startsWith("B_f2_") || nodeId.startsWith("B_f3_"));
  };

  // (All helper functions - auto-fit, pan, zoom, click - are unchanged)
  // ...
  // ------------------------------
  // 🧭 Auto-fit map
  // ------------------------------
  useLayoutEffect(() => {
    if (!containerRef.current || !contentRef.current || !mapData) {
      return;
    }

    const el = containerRef.current;
    const { clientWidth, clientHeight } = el;
    const svgBox = contentRef.current.getBBox();

    if (svgBox && svgBox.width > 0 && svgBox.height > 0) {
      // --- GOOD Path ---
      const scaleX = clientWidth / svgBox.width;
      const scaleY = clientHeight / svgBox.height;
      const fitScale = Math.min(scaleX, scaleY) * 0.9; 
      const newOffsetX = (clientWidth / fitScale - svgBox.width) / 2 - svgBox.x;
      const newOffsetY = (clientHeight / fitScale - svgBox.height) / 2 - svgBox.y;
      setScale(fitScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    } else {
      // --- FALLBACK Path ---
      const scaleX = clientWidth / mapData.width;
      const scaleY = clientHeight / mapData.height;
      const fitScale = Math.min(scaleX, scaleY) * 0.95;
      const offsetX = (clientWidth / fitScale - mapData.width) / 2;
      const offsetY = (clientHeight / fitScale - mapData.height) / 2;
      setScale(fitScale);
      setOffset({ x: offsetX, y: offsetY });
    }
  }, [mapData]);

  // ------------------------------
  // 🖱️ Mouse Wheel Zoom
  // ------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      setScale((prev) => Math.min(Math.max(0.5, prev + delta), 3));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ------------------------------
  // 🖱️ Mouse Pan (Shift + Drag)
  // ------------------------------
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.shiftKey) {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    setOffset((prev) => ({ x: prev.x + dx / scale, y: prev.y + dy / scale }));
  };
  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // ------------------------------
  // 🤏 Touch Pan + Pinch Zoom
  // ------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const DRAG_SMOOTHNESS = 0.6;
    const ZOOM_SENSITIVITY = 0.007;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        pinchRef.current.isPinching = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchRef.current.lastDist = Math.hypot(dx, dy);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pinchRef.current.isPinching && e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const delta = (dist - pinchRef.current.lastDist) * ZOOM_SENSITIVITY;
        pinchRef.current.lastDist = dist;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() =>
          setScale((prev) => Math.min(Math.max(0.5, prev + delta), 3))
        );
        return;
      }
      if (isDraggingRef.current && e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastMouseRef.current.x;
        const dy = e.touches[0].clientY - lastMouseRef.current.y;
        e.preventDefault();
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setOffset((prev) => ({
          x: prev.x + (dx / scale) * DRAG_SMOOTHNESS,
          y: prev.y + (dy / scale) * DRAG_SMOOTHNESS,
        }));
      }
    };
    const onTouchEnd = () => {
      isDraggingRef.current = false;
      pinchRef.current.isPinching = false;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [scale]);

  // ------------------------------
  // 📍 Click Handler
  // ------------------------------
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || isDraggingRef.current) return;
    if (path && path.length > 1) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm =
      viewportRef.current?.getScreenCTM() || svgRef.current.getScreenCTM();
    if (!ctm) return;
    const inv = ctm.inverse();
    const svgP = pt.matrixTransform(inv);
    onMapClick(svgP.x, svgP.y);
  };
  // ------------------------------
  // 🖼️ Render
  // ------------------------------
  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(var(--vh)*70)] sm:h-[600px] bg-[hsl(var(--map-bg))] rounded-lg overflow-hidden border-2 border-border shadow-lg select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 🏷️ Map Label */}
      <div className="absolute top-4 right-4 z-10 bg-card/95 backdrop-blur px-4 py-2 rounded-lg shadow-md border border-border">
        <p className="text-sm font-semibold text-foreground">
          {buildingMaps[selectedBuilding].name} —{" "}
          {currentFloor === "floor1" ? "Ground Floor" : currentFloor === "floor2" ? "Floor 2" : "Floor 3"}
        </p>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onClick={handleSvgClick}
        className="cursor-crosshair"
      >
        <g
          ref={viewportRef}
          transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}
        >
          {/* 🟩 Background grid */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="1"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect width={mapData.width} height={mapData.height} fill="url(#grid)" />

          {/* ✅ --- CONTENT GROUP FOR CENTERING --- ✅ */}
          <g ref={contentRef}>

            {/* ✅ --- Outer Boundary for Building A, F1 --- ✅ */}
            {selectedBuilding === "buildingA" && currentFloor === "floor1" && (
              <polygon
                points="238,348,252,379,189,485,292,549,324,547,322,515,289,516,258,475,292,421,291,441,321,443,320,422,322,514,324,547,374,552,376,407,401,406,448,494,454,600,509,598,491,461,447,408,449,292,501,215,455,189,408,281,380,291,383,141,336,142,337,176,342,279,331,279,330,256,299,256,299,281,292,282,261,240,284,190,337,177,336,141,276,148,256,136,209,151,201,187,246,285,239,316,220,316,222,347"
                fill="hsl(var(--map-bg))"
                stroke="hsl(var(--foreground))"
                strokeWidth="4"
                opacity="0.5"
              />
            )}
            
            {/* ✅ --- Outer Boundary for Building A, F2 --- ✅ */}
            {selectedBuilding === "buildingA" && currentFloor === "floor2" && (
              <polygon
                points="217,368,252,379,189,485,292,549,324,547,322,515,289,516,258,475,292,421,291,441,321,443,320,422,322,514,324,547,374,552,376,407,401,406,448,494,454,538,504,536,491,461,447,408,449,292,501,215,455,189,408,281,380,291,383,141,336,142,337,176,342,279,331,279,330,256,299,256,299,281,292,282,261,240,284,190,337,177,336,141,276,148,256,136,209,151,201,187,246,285,211,295,220,316,222,347"
                fill="hsl(var(--map-bg))"
                stroke="hsl(var(--foreground))"
                strokeWidth="4"
                opacity="0.5"
              />
            )}

            {/* ✅ Outer Boundary for Building B, F1 */}
            {selectedBuilding === "buildingB" && currentFloor === "floor1" && (
              <polygon
                points="973,287,975,114,926,114,921,286,880,279,880,104,817,103,814,275,795,276,794,248,762,249,762,278,734,276,738,138,690,134,685,276,605,277,607,175,668,170,670,118,515,116,515,181,536,187,538,274,517,274,517,255,478,250,481,272,463,274,468,134,481,131,481,108,441,112,442,136,410,136,408,275,332,273,329,241,236,237,238,212,306,210,307,186,234,176,233,186,217,192,214,253,204,262,204,301,213,305,209,370,227,379,229,401,252,402,259,351,238,349,244,322,328,321,328,288,407,288,406,434,462,440,464,289,542,288,539,439,600,444,602,295,680,294,679,440,728,443,735,296,818,301,819,409,878,411,879,293,921,301,918,451,909,453,907,476,982,479,980,456,972,456,972,304"
                fill="hsl(var(--map-bg))"
                stroke="hsl(var(--foreground))"
                strokeWidth="4"
                opacity="0.5"
              />
            )}
            
            {/* ✅ Outer Boundary for Building B, F2/F3 */}
            {selectedBuilding === "buildingB" && (currentFloor === "floor2" || currentFloor === "floor3") && (
              <polygon
                points="979,114,926,114,921,286,880,279,880,104,817,103,814,275,795,276,794,248,762,249,762,278,734,276,738,138,690,134,685,276,605,277,607,175,668,170,670,118,515,116,515,181,536,187,538,274,517,274,517,255,478,250,481,272,463,274,468,134,481,131,481,108,441,112,442,136,410,136,408,275,332,273,329,241,236,237,238,271,206,261,204,301,234,291,244,322,328,321,328,288,407,288,406,434,462,440,464,289,542,288,539,439,600,444,602,295,680,294,679,440,728,443,735,296,818,301,819,409,878,411,879,293,921,301,918,451,909,453,907,476,982,479,980,456,972,456,972,304,976,288"
                fill="hsl(var(--map-bg))"
                stroke="hsl(var(--foreground))"
                strokeWidth="4"
                opacity="0.5"
              />
            )}

            {/* 🧱 Rooms (This logic is already perfect) */}
            {mapData.roomAreas?.map((area: RoomArea) => {
              // ... (rest of room logic is unchanged)
              const isDest = destinationNode && destinationNode.id === area.nodeId;
              const isStart = path.length > 0 && path[0].id === area.nodeId;
              const fill = isDest ? "hsl(var(--marker-destination))" : isStart ? "hsl(var(--marker-current))" : "red"; 

              if (area.type === "poly" && area.points) {
                return (
                  <polygon
                    key={area.id}
                    points={area.points}
                    fill={fill}
                    opacity={isDest || isStart ? 0.5 : 0.4}
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                  />
                );
              }
              if (area.x !== undefined && area.y !== undefined) {
                return (
                  <rect
                    key={area.id}
                    x={area.x}
                    y={area.y}
                    width={area.width}
                    height={area.height}
                    fill={fill}
                    opacity={isDest || isStart ? 0.5 : 0.4}
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                  />
                );
              }
              return null;
            })}

            {/* 🧩 Corridors */}
            {mapData.edges.map((edge: any, idx: number) => {
              const from = mapData.nodes.find((n: Node) => n.id === edge.from);
              const to = mapData.nodes.find((n: Node) => n.id === edge.to);
              if (!from || !to) return null;
              return (
                <line
                  key={idx}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="hsl(var(--border))"
                  strokeWidth="3"
                  opacity="0.5"
                />
              );
            })}
            {/* 🟦 Path */}
            {path.length > 1 && (
              <g className="navigation-path">
                <polyline
                  points={path.map((n) => `${n.x},${n.y}`).join(" ")}
                  fill="none"
                  stroke="hsl(var(--path-color))"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {path.map((node, idx) => (
                  <circle
                    key={idx}
                    cx={node.x}
                    cy={node.y}
                    r="4"
                    fill="hsl(var(--accent))"
                    className="animate-pulse"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  />
                ))}
              </g>
            )}
            
            {/* 📍 POIs ( ✅ --- THIS IS THE UPDATED SECTION --- ✅ ) */}
            {mapData.pois.map((poi: any) => {
              const node = mapData.nodes.find((n: Node) => n.id === poi.node);
              if (!node) return null;
              const Icon = iconMap[poi.icon || "info"];
              return (
                <g key={poi.id} transform={`translate(${node.x}, ${node.y})`}>
                  <circle
                    r="12" // Pulse circle smaller
                    fill="hsl(var(--primary))"
                    opacity="0.2"
                    className="animate-pulse"
                  />
                  <circle r="8" fill="hsl(var(--primary))" /> {/* Main circle smaller */}
                  <foreignObject x="-6" y="-6" width="12" height="12"> {/* Icon container smaller */}
                    <Icon className="w-3 h-3 text-primary-foreground" /> {/* Icon smaller */}
                  </foreignObject>
                  <text
                    y="18" // Text closer
                    textAnchor="middle"
                    fill="hsl(var(--poi-label))"
                    fontSize="10" // Font smaller
                    fontWeight="600"
                    className="select-none"
                  >
                    {poi.name}
                  </text>
                </g>
              );
            })}

            {/* 🟢 Current Location ( ✅ --- SHRUNK TO MATCH --- ✅ ) */}
            {currentLocation && (
              <g transform={`translate(${currentLocation.x}, ${currentLocation.y})`}>
                <circle
                  r="20" // Pulse smaller
                  fill="hsl(var(--marker-current))"
                  opacity="0.3"
                  className="animate-ping"
                />
                <circle r="8" fill="hsl(var(--marker-current))" /> {/* Main circle smaller */}
                <circle r="4" fill="white" /> {/* Inner dot smaller */}
                <text
                  y="-15" // Text closer
                  textAnchor="middle"
                  fill="hsl(var(--marker-current))"
                  fontSize="10" // Font smaller
                  fontWeight="bold"
                  className="select-none"
                >
                  You Are Here
                </text>
              </g>
            )}

            {/* 🎯 Destination ( ✅ --- SHRUNK TO MATCH --- ✅ ) */}
            {destinationNode && isNodeOnCurrentFloor(destinationNode.id) && (
              <g transform={`translate(${destinationNode.x}, ${destinationNode.y})`}>
                <circle
                  r="18" // Pulse smaller
                  fill="hsl(var(--marker-destination))"
                  opacity="0.3"
                  className="animate-pulse"
                />
                <circle r="8" fill="hsl(var(--marker-destination))" /> {/* Main circle smaller */}
                <text
                  y="-15" // Text closer
                  textAnchor="middle"
                  fill="hsl(var(--marker-destination))"
                  fontSize="10" // Font smaller
                  fontWeight="bold"
                  className="select-none"
                >
                  Destination
                </text>
              </g>
            )}
          </g>
          {/* ✅ --- END OF CONTENT GROUP --- ✅ */}
        </g>
      </svg>
    </div>
  );
};